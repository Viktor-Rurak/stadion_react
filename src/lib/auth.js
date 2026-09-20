// Реєстрація та вхід користувачів.
//
// Як це влаштовано:
// - Email і пароль зберігає вбудована система Supabase Auth
//   (пароль — у захешованому вигляді, ми його ніколи не бачимо).
// - Решта даних (логін, ім'я, прізвище, телефон) потрапляє в таблицю
//   `profiles` — її автоматично заповнює тригер у базі при реєстрації.
// - Увійти можна за email АБО за логіном: якщо введено логін,
//   ми спершу питаємо базу, яка пошта відповідає цьому логіну.
import { supabase } from './supabase.js';

/**
 * Чи вільний такий логін? Зручно викликати прямо у формі реєстрації,
 * коли користувач закінчив вводити логін.
 * Приклад: await isLoginAvailable('vitya')  ->  true / false
 */
export async function isLoginAvailable(login) {
  const { data, error } = await supabase.rpc('login_available', { p_login: login });
  if (error) throw new Error('Не вдалося перевірити логін. Спробуйте ще раз.');
  return data;
}

/**
 * Реєстрація нового користувача.
 * Приклад: register({ login: 'vitya', email: 'v@mail.com', password: '...',
 *                     firstName: 'Віктор', lastName: 'Прізвище', phone: '+380...' })
 */
export async function register({ login, email, password, firstName, lastName, phone }) {
  // Проста перевірка логіна ще до запиту в базу
  // (та сама умова, що й у таблиці profiles)
  if (!/^[A-Za-z0-9._]{3,30}$/.test(login)) {
    throw new Error('Логін: 3–30 символів, лише латинські літери, цифри, крапка чи _');
  }

  // Перевіряємо логін заздалегідь: інакше база відхилить реєстрацію
  // сама, але повідомлення буде незрозумілим
  if (!(await isLoginAvailable(login))) {
    throw new Error('Цей логін уже зайнятий. Оберіть інший.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Ці дані підхопить тригер у базі та створить профіль
    options: {
      data: {
        login,
        first_name: firstName,
        last_name: lastName,
        phone,
      },
    },
  });

  if (error) throw new Error(translateAuthError(error));
  // Повертаємо { user, session }: якщо session порожня — Supabase
  // чекає, поки людина підтвердить пошту листом
  return data;
}

/**
 * Вхід за email АБО логіном + пароль.
 * Приклад: login('vitya', 'мій-пароль') чи login('v@mail.com', 'мій-пароль')
 */
export async function login(loginOrEmail, password) {
  let email = loginOrEmail.trim();

  // Якщо в полі немає «@» — це логін. Питаємо в бази відповідну пошту.
  if (!email.includes('@')) {
    const { data, error } = await supabase.rpc('email_for_login', {
      p_login: email,
    });
    if (error) throw new Error('Не вдалося перевірити логін. Спробуйте ще раз.');
    if (!data) throw new Error('Користувача з таким логіном не знайдено');
    email = data;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error));
  return data.user;
}

/** Вихід із акаунта */
export async function logout() {
  await supabase.auth.signOut();
}

/** Поточний користувач (або null, якщо не залогінений) */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Профіль поточного користувача (логін, ім'я, телефон...) */
export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('login, first_name, last_name, phone, email, is_admin')
    .eq('id', user.id)
    .single();

  if (error) throw new Error('Не вдалося завантажити профіль');
  return data;
}

// Переклад типових помилок Supabase Auth зрозумілою мовою
function translateAuthError(error) {
  const msg = error.message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Невірна пошта/логін або пароль';
  if (msg.includes('already registered')) return 'Користувач із такою поштою вже існує';
  if (msg.includes('Password should be')) return 'Пароль закороткий (мінімум 6 символів)';
  if (msg.includes('Email not confirmed')) return 'Підтвердіть пошту: перейдіть за посиланням із листа';
  // Вбудований поштовий сервіс Supabase має жорсткий ліміт
  // (кілька листів на годину на безкоштовному тарифі)
  if (msg.includes('rate limit') || msg.includes('over_email_send')) {
    return 'Забагато спроб реєстрації поспіль: Supabase дозволяє лише кілька листів на годину. Зачекайте близько години або вимкніть підтвердження пошти в налаштуваннях Supabase.';
  }
  if (msg.includes('For security purposes')) {
    return 'Зачекайте кілька секунд перед наступною спробою.';
  }
  // Supabase формулює це по-різному: 'Unable to validate email address',
  // 'Email address "..." is invalid' тощо — ловимо всі варіанти
  if (msg.includes('valid email') || msg.includes('email address')
      || msg.toLowerCase().includes('email') && msg.includes('invalid')) {
    return 'Введіть коректну електронну пошту (Supabase не приймає, зокрема, адреси на example.com)';
  }
  // Так виглядає відмова тригера в базі — найчастіше це зайнятий
  // або некоректний логін
  if (msg.includes('Database error saving new user')) {
    return 'Не вдалося створити акаунт: перевірте логін (3–30 символів, лише латиниця, цифри, крапка чи _)';
  }
  return msg || 'Щось пішло не так. Спробуйте ще раз.';
}
