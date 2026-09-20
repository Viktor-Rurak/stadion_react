// Новини стадіону.
//
// Читати може будь-хто, а писати, редагувати й видаляти — лише адміни.
// Це стереже сама база: у політиках стоїть перевірка `is_admin()`, тому
// звичайний користувач нічого не змінить, навіть якщо надішле запит
// в обхід інтерфейсу.
//
// Фото лежать у сховищі Supabase (кошик `news`): туди кладе лише адмін,
// а дивитися на них можуть усі за прямим посиланням.
import { supabase } from './supabase.js';

const BUCKET = 'news';
const MAX_IMAGE_MB = 5;

/** Останні новини — найсвіжіші згори */
export async function listNews(limit = 30) {
  const { data, error } = await supabase
    .from('news')
    .select('id, title, body, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('Не вдалося завантажити новини');
  return data;
}

/**
 * Створити новину. Фото необов'язкове.
 * Приклад: createNews({ title: 'Новий газон', body: 'Текст…', imageFile: file })
 */
export async function createNews({ title, body, imageFile }) {
  const clean = check(title, body);
  const imageUrl = imageFile ? await uploadImage(imageFile) : null;

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('news')
    .insert({
      title: clean.title,
      body: clean.body,
      image_url: imageUrl,
      author_id: userData.user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(translateNewsError(error));
  return data;
}

/**
 * Змінити новину.
 * imageFile — нове фото (старе замінюється), removeImage — прибрати фото зовсім.
 */
export async function updateNews(id, { title, body, imageFile, removeImage }) {
  const clean = check(title, body);
  const patch = { title: clean.title, body: clean.body };

  // Старе фото запам'ятовуємо, щоб потім прибрати зі сховища
  let oldUrl = null;
  if (imageFile || removeImage) {
    const { data: current } = await supabase
      .from('news')
      .select('image_url')
      .eq('id', id)
      .maybeSingle();
    oldUrl = current?.image_url ?? null;
    patch.image_url = imageFile ? await uploadImage(imageFile) : null;
  }

  const { data, error } = await supabase
    .from('news')
    .update(patch)
    .eq('id', id)
    .select();

  if (error) throw new Error(translateNewsError(error));
  if (!data || data.length === 0) {
    throw new Error('Не вдалося зберегти: новини вже немає або ви не адміністратор.');
  }

  if (oldUrl) await removeImageByUrl(oldUrl);
  return data[0];
}

/** Видалити новину разом із її фото */
export async function deleteNews(id) {
  const { data: current } = await supabase
    .from('news')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase.from('news').delete().eq('id', id).select('id');

  if (error) throw new Error(translateNewsError(error));
  if (!data || data.length === 0) {
    throw new Error('Не вдалося видалити: новини вже немає або ви не адміністратор.');
  }

  if (current?.image_url) await removeImageByUrl(current.image_url);
}

/** '2026-09-13T10:00:00Z' -> '13 вересня 2026' */
export function formatNewsDate(iso) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(iso));
}

// --- Фото ------------------------------------------------------------------

/** Кладе фото у сховище й повертає посилання на нього */
async function uploadImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Фото має бути картинкою: jpg, png, webp або gif');
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`Фото завелике — максимум ${MAX_IMAGE_MB} МБ`);
  }

  // Ім'я файлу вигадуємо своє: у назві з телефона бувають пробіли й кирилиця
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(translateStorageError(error));

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Прибирає фото зі сховища за його посиланням (тихо, без помилок) */
async function removeImageByUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return;

  const path = url.slice(at + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

// --- Перевірки та переклад помилок -----------------------------------------

function check(title, body) {
  const cleanTitle = (title ?? '').trim();
  const cleanBody = (body ?? '').trim();

  if (cleanTitle.length < 3) throw new Error('Заголовок закороткий — щонайменше 3 символи');
  if (cleanTitle.length > 200) throw new Error('Заголовок задовгий — максимум 200 символів');
  if (!cleanBody) throw new Error('Напишіть текст новини');
  if (cleanBody.length > 8000) throw new Error('Текст задовгий — максимум 8000 символів');

  return { title: cleanTitle, body: cleanBody };
}

function translateNewsError(error) {
  const text = `${error.code ?? ''} ${error.message ?? ''}`;

  if (text.includes('42501') || text.includes('row-level security')) {
    return 'Змінювати новини можуть лише адміністратори.';
  }
  if (text.includes('title_length')) return 'Заголовок має бути від 3 до 200 символів.';
  if (text.includes('body_length')) return 'Текст новини не може бути порожнім.';
  return 'Не вдалося зберегти новину. Спробуйте ще раз.';
}

function translateStorageError(error) {
  const msg = error.message ?? '';

  if (msg.toLowerCase().includes('row-level security') || msg.includes('Unauthorized')) {
    return 'Завантажувати фото можуть лише адміністратори.';
  }
  if (msg.includes('maximum allowed size')) return `Фото завелике — максимум ${MAX_IMAGE_MB} МБ`;
  if (msg.includes('mime type')) return 'Такий тип файлу не приймається — оберіть jpg, png або webp.';
  return 'Не вдалося завантажити фото. Спробуйте ще раз.';
}
