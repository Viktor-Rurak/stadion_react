// Скасування реєстрації, поки пошту ще не підтверджено.
//
// Коли людина закриває вікно «Майже готово, ми надіслали лист», сайт
// викликає цю функцію: акаунт видаляється, і можна зареєструватися знову
// (наприклад, виправивши помилку в пошті).
//
// Захист:
// - видалити можна лише знаючи пароль цього акаунта;
// - і лише поки пошту НЕ підтверджено — підтверджений акаунт ця функція
//   не чіпає ніколи.
//
// Виклик із сайту:
//   supabase.functions.invoke('cancel-signup', { body: { email, password } })
//
// Ця копія лежить у проєкті для читання; працює вона в Supabase
// (Edge Functions → cancel-signup). Змінили тут — задеплойте заново.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = String(body.email ?? '').trim().toLowerCase();
    password = String(body.password ?? '');
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (!email.includes('@') || password.length < 6 || password.length > 72) {
    return json({ error: 'invalid_credentials' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // Перевіряємо пароль. Supabase відповідає «пошта не підтверджена» лише
  // тоді, коли пароль ПРАВИЛЬНИЙ, — це і є доказ, що запит робить власник.
  const { data, error } = await admin.auth.signInWithPassword({ email, password });

  // Пошту вже підтверджено (наприклад, в іншій вкладці) — нічого не видаляємо
  if (data?.session) return json({ error: 'already_confirmed' }, 409);
  if (error?.code !== 'email_not_confirmed') return json({ error: 'invalid_credentials' }, 401);

  // Знаходимо акаунт за поштою (профіль має ту саму пошту й той самий id)
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (!profile) return json({ error: 'not_found' }, 404);

  // Ще раз переконуємось, що пошту не підтверджено, — підтверджений акаунт не чіпаємо
  const { data: found } = await admin.auth.admin.getUserById(profile.id);
  if (!found?.user || found.user.email_confirmed_at) {
    return json({ error: 'already_confirmed' }, 409);
  }

  // Видаляємо акаунт; профіль зникає разом із ним (каскад у базі)
  const { error: deleteError } = await admin.auth.admin.deleteUser(profile.id);
  if (deleteError) return json({ error: 'server_error' }, 500);

  return json({ ok: true });
});
