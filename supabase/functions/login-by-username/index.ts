// Вхід за логіном (а не поштою).
//
// Навіщо окрема серверна функція: раніше сайт сам питав у бази «яка пошта
// в цього логіна» і вже потім входив. Через це будь-хто, знаючи чужий логін,
// міг дізнатися чужу пошту. Тепер пошуком займається ця функція з сервісним
// ключем, а назовні йде лише готова сесія або загальна помилка «невірний
// логін або пароль» — пошта нікуди не витікає.
//
// Виклик із сайту: supabase.functions.invoke('login-by-username', { body: { login, password } })
//
// Ця копія лежить у проєкті для читання; працює вона в Supabase
// (Edge Functions → login-by-username). Якщо щось міняєте тут —
// задеплойте заново: supabase functions deploy login-by-username
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Та сама умова для логіна, що й у таблиці profiles
const LOGIN_RULE = /^[A-Za-z0-9._]{3,30}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let login = '';
  let password = '';
  try {
    const body = await req.json();
    login = String(body.login ?? '').trim();
    password = String(body.password ?? '');
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (!LOGIN_RULE.test(login) || password.length < 6 || password.length > 72) {
    return json({ error: 'invalid_credentials' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Пошту за логіном може дістати лише сервісний ключ — з клієнта ця функція закрита
  const { data: email, error: lookupError } = await admin.rpc('email_for_login', { p_login: login });
  if (lookupError) return json({ error: 'server_error' }, 500);

  // Невідомий логін і неправильний пароль відповідають ОДНАКОВО:
  // так не можна дізнатися, чи існує такий логін
  if (!email) return json({ error: 'invalid_credentials' }, 401);

  const { data, error } = await admin.auth.signInWithPassword({ email, password });

  // Пароль правильний, але людина ще не перейшла за посиланням із листа.
  // Supabase перевіряє це ПІСЛЯ пароля, тож сторонній так нічого не дізнається.
  // Пошту повертаємо, щоб сайт міг запропонувати надіслати лист ще раз:
  // її бачить лише той, хто ввів правильний пароль, тобто власник.
  if (error?.code === 'email_not_confirmed') {
    return json({ error: 'email_not_confirmed', email }, 401);
  }
  if (error || !data.session) return json({ error: 'invalid_credentials' }, 401);

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
