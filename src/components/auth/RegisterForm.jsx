// Форма реєстрації нового акаунта.
// Поля відповідають таблиці profiles у базі:
// логін, ім'я, прізвище, телефон, пошта + пароль.
import { useState } from 'react';
import { register, isLoginAvailable } from '../../lib/auth.js';

// Умова для логіна — та сама, що й у базі даних
const LOGIN_RULE = /^[A-Za-z0-9._]{3,30}$/;

export default function RegisterForm({ onSuccess }) {
  // Усі поля форми тримаємо в одному об'єкті — так простіше
  const [form, setForm] = useState({
    login: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    passwordRepeat: '',
  });

  const [loginStatus, setLoginStatus] = useState(null); // 'free' | 'taken' | null
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); // поки чекаємо відповідь сервера

  // Записати значення в одне поле
  function set(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
    setError('');
  }

  // Перевіряємо логін, щойно людина перейшла до наступного поля
  async function checkLogin() {
    if (!LOGIN_RULE.test(form.login)) {
      setLoginStatus(null);
      return;
    }
    try {
      setLoginStatus((await isLoginAvailable(form.login)) ? 'free' : 'taken');
    } catch {
      setLoginStatus(null); // не змогли перевірити — не заважаємо
    }
  }

  async function handleSubmit(event) {
    event.preventDefault(); // не даємо сторінці перезавантажитись

    // Прості перевірки до звернення в базу
    if (!LOGIN_RULE.test(form.login)) {
      setError('Логін: 3–30 символів, лише латинські літери, цифри, крапка чи _');
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Заповніть ім\u2019я та прізвище');
      return;
    }
    // Ті самі межі, що й у базі (profiles): інакше база відхилить реєстрацію
    if (form.firstName.trim().length > 60 || form.lastName.trim().length > 60) {
      setError('Ім’я та прізвище — до 60 символів');
      return;
    }
    // Ловимо типову помилку: пошту вписали в поле імені
    if (/[@\d]/.test(form.firstName) || /[@\d]/.test(form.lastName)) {
      setError('В імені та прізвищі не може бути цифр чи «@» — перевірте, чи не вписали туди пошту');
      return;
    }
    // Поширені описки в пошті — підказуємо, що саме не так
    const email = form.email.trim();
    if (email.endsWith('.')) {
      setError('У кінці пошти зайва крапка');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(email)) {
      setError('Пошта має бути на кшталт ivan@gmail.com — перевірте, чи немає пробілів і описок');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 9 || form.phone.trim().length > 20) {
      setError('Введіть коректний номер телефону');
      return;
    }
    if (form.password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів');
      return;
    }
    if (form.password !== form.passwordRepeat) {
      setError('Паролі не збігаються — перевірте обидва поля');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // Пробіли по краях прибираємо, щоб у базу не йшло «Іван »
      const { session } = await register({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      // Якщо сесія є — людина вже увійшла. Якщо ні — треба підтвердити пошту.
      onSuccess(session, { email: form.email.trim(), password: form.password });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Логін</span>
        <input
          className="field-input"
          value={form.login}
          onChange={(e) => set('login', e.target.value)}
          onBlur={checkLogin}
          placeholder="ivan.koval"
          autoComplete="username"
          autoFocus
        />
        {loginStatus === 'free' && <span className="field-hint is-ok">Логін вільний</span>}
        {loginStatus === 'taken' && <span className="field-hint is-bad">Цей логін уже зайнятий</span>}
        {loginStatus === null && (
          <span className="field-hint">Латинські літери, цифри, крапка або _</span>
        )}
      </label>

      {/* Ім'я та прізвище — в один рядок на широкому екрані */}
      <div className="field-row">
        <label className="field">
          <span className="field-label">Ім&#39;я</span>
          <input
            className="field-input"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            placeholder="Іван"
            autoComplete="given-name"
          />
        </label>

        <label className="field">
          <span className="field-label">Прізвище</span>
          <input
            className="field-input"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Коваленко"
            autoComplete="family-name"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Номер телефону</span>
        <input
          className="field-input"
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="+380 50 111 22 33"
          autoComplete="tel"
        />
      </label>

      <label className="field">
        <span className="field-label">Електронна пошта</span>
        <input
          className="field-input"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="ivan@example.com"
          autoComplete="email"
        />
      </label>

      <label className="field">
        <span className="field-label">Пароль</span>
        <input
          className="field-input"
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          placeholder="Щонайменше 8 символів"
          autoComplete="new-password"
        />
      </label>

      <label className="field">
        <span className="field-label">Повторіть пароль</span>
        <input
          className="field-input"
          type="password"
          value={form.passwordRepeat}
          onChange={(e) => set('passwordRepeat', e.target.value)}
          placeholder="Той самий пароль ще раз"
          autoComplete="new-password"
        />
        {/* Підказка з'являється, лише коли є що порівнювати */}
        {form.passwordRepeat && form.password !== form.passwordRepeat && (
          <span className="field-hint is-bad">Паролі не збігаються</span>
        )}
        {form.passwordRepeat && form.password === form.passwordRepeat && (
          <span className="field-hint is-ok">Паролі збігаються</span>
        )}
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button className="btn-primary auth-submit" type="submit" disabled={busy}>
        {busy ? 'Створюємо акаунт…' : 'Створити акаунт'}
      </button>

      {/* Ми збираємо ім'я, телефон і пошту, тож людина має знати навіщо */}
      <p className="auth-consent">
        Створюючи акаунт, ви погоджуєтеся, що ваші ім&#39;я, телефон і пошта
        зберігатимуться для запису на майданчики. Ми не передаємо їх нікому
        й не надсилаємо рекламу.
      </p>
    </form>
  );
}
