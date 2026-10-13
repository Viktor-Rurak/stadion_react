// Реєстрація та вхід користувачів.
//
// Як це влаштовано:
// - Email і пароль зберігає вбудована система Supabase Auth
//   (пароль — у захешованому вигляді, ми його ніколи не бачимо).
// - Решта даних (логін, ім'я, прізвище, телефон) потрапляє в таблицю
//   `profiles` — її автоматично заповнює тригер у базі при реєстрації.
// - Увійти можна за email АБО за логіном: логін перевіряє серверна
//   функція login-by-username (див. supabase/functions/).
// - Листи (підтвердження пошти, відновлення пароля) надсилає Supabase
//   через пошту стадіону — налаштування в README, розділ «Пошта».
import { supabase } from './supabase.js';

/**
 * Чи вільний такий логін? Зручно викликати прямо у формі реєстрації,
 * коли користувач закінчив вводити логін.
 * Приклад: await isLoginAvailable('ivan.koval')  ->  true / false
 */
export async function isLoginAvailable(login) {
  const { data, error } = await supabase.rpc('login_available', { p_login: login });
  if (error) throw new Error('Не вдалося перевірити логін. Спробуйте ще раз.');
  return data;
}

/**
 * Реєстрація нового користувача.
 * Приклад: register({ login: 'ivan.koval', email: 'ivan@mail.com', password: '...',
 *                     firstName: 'Іван', lastName: 'Коваленко', phone: '+380...' })
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
      // Куди повернути людину після кліку в листі «Підтвердіть пошту»
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw new Error(translateAuthError(error));

  // Коли підтвердження пошти ввімкнене, Supabase на вже зайняту пошту
  // не повертає помилку, а «вдає» успіх із порожнім списком identities
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('Користувач із такою поштою вже існує');
  }
  // Повертаємо { user, session }: якщо session порожня — Supabase
  // чекає, поки людина підтвердить пошту листом
  return data;
}

/**
 * Вхід за email АБО логіном + пароль.
 * Приклад: login('ivan.koval', 'мій-пароль') чи login('ivan@mail.com', 'мій-пароль')
 */
export async function login(loginOrEmail, password) {
  const value = loginOrEmail.trim();

  // Немає «@» — це логін. Пошту за ним шукає серверна функція
  // (supabase/functions/login-by-username): так ніхто з клієнта не може
  // дізнатися чужу пошту за логіном — назовні йде лише готова сесія
  // або загальна помилка «невірний логін або пароль».
  if (!value.includes('@')) {
    const { data, error } = await supabase.functions.invoke('login-by-username', {
      body: { login: value, password },
    });

    if (error) {
      const body = await readFunctionError(error);
      if (body?.error === 'invalid_credentials') throw new Error('Невірний логін або пароль');
      if (body?.error === 'email_not_confirmed') throw notConfirmedError(body.email);
      throw new Error('Не вдалося увійти. Спробуйте ще раз.');
    }

    // Отримані токени стають сесією в браузері — далі все як після звичайного входу
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw new Error('Не вдалося увійти. Спробуйте ще раз.');
    return sessionData.user;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: value, password });
  if (error?.code === 'email_not_confirmed') throw notConfirmedError(value);
  if (error) throw new Error(translateAuthError(error));
  return data.user;
}

// Помилка «пошта не підтверджена» несе в собі адресу, щоб форма входу
// могла одразу запропонувати надіслати лист ще раз
function notConfirmedError(email) {
  const error = new Error('Пошту ще не підтверджено. Знайдіть лист від «Стадіон Дубівці» або надішліть його ще раз.');
  error.email = email ?? null;
  return error;
}

// Серверна функція відповідає JSON { error: 'код', … } — дістаємо його
async function readFunctionError(error) {
  try {
    return await error.context?.json();
  } catch {
    return null;
  }
}

/**
 * Надіслати лист для відновлення пароля.
 * Кнопка в листі відкриє /auth/confirm, а звідти — /reset-password,
 * де людина задасть новий пароль.
 *
 * Навмисно НЕ кажемо, чи існує акаунт із такою поштою: інакше форму
 * можна було б використати, щоб перевіряти чужі адреси.
 */
export async function requestPasswordReset(email) {
  const clean = email.trim();
  if (!clean.includes('@')) throw new Error('Введіть електронну пошту, вказану під час реєстрації');

  // Адреса сайту потрапляє в кнопку листа: {{ .RedirectTo }}/auth/confirm?…
  // Тому лише корінь сайту — /auth/confirm сам переведе на /reset-password
  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(translateAuthError(error));
}

/** Задати новий пароль (після переходу з листа або просто коли людина увійшла) */
export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error));
}

/**
 * Підтвердити посилання з листа (сторінка /auth/confirm).
 * type: 'email' — підтвердження пошти, 'recovery' — відновлення пароля.
 * Після успіху людина вже в акаунті.
 */
export async function verifyEmailLink(tokenHash, type) {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    // Посилання одноразові й живуть годину — найчастіша причина саме ця
    throw new Error(
      'Посилання з листа застаріло або вже використане. Надішліть собі новий лист.'
    );
  }
}

/**
 * Надіслати лист підтвердження пошти ще раз (якщо перший загубився).
 * Supabase дозволяє один лист на хвилину; якщо попросити раніше,
 * помилка матиме поле retryAfter — скільки секунд ще чекати.
 */
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) {
    const wait = Number(error.message?.match(/after (\d+) seconds?/)?.[1]);
    const failure = new Error(
      wait ? `Лист щойно надсилали — новий можна через ${wait} с.` : translateAuthError(error)
    );
    failure.retryAfter = wait || null;
    throw failure;
  }
}

/**
 * Скасувати реєстрацію, поки пошту не підтверджено (закрили вікно
 * «Майже готово»). Акаунт видаляється — і можна зареєструватися знову.
 * Видаляє серверна функція cancel-signup: вона перевіряє пароль і ніколи
 * не чіпає акаунти з уже підтвердженою поштою.
 * Повертає 'cancelled' або 'already_confirmed'.
 */
export async function cancelSignup(email, password) {
  const { error } = await supabase.functions.invoke('cancel-signup', {
    body: { email, password },
  });
  if (!error) return 'cancelled';

  const body = await readFunctionError(error);
  if (body?.error === 'already_confirmed') return 'already_confirmed';
  throw new Error('Не вдалося скасувати реєстрацію. Перевірте інтернет і спробуйте ще раз.');
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
  if (msg.includes('Password should be')) return 'Пароль закороткий (мінімум 8 символів)';
  if (msg.includes('Email not confirmed')) return 'Підтвердіть пошту: перейдіть за посиланням із листа';
  if (msg.includes('should be different')) return 'Новий пароль має відрізнятися від старого';
  if (msg.includes('Auth session missing')) {
    return 'Посилання з листа застаріло або вже використане. Запросіть новий лист.';
  }
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
