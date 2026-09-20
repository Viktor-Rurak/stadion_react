// Форма реєстрації нового акаунта.
// Поля відповідають таблиці profiles у базі:
// логін, ім'я, прізвище, телефон, пошта + пароль.
import { useState } from 'react';
import { register, isLoginAvailable } from '../lib/auth.js';

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
    if (form.phone.replace(/\D/g, '').length < 9) {
      setError('Введіть коректний номер телефону');
      return;
    }
    if (form.password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів');
      return;
    }
    if (form.password !== form.passwordRepeat) {
      setError('Паролі не збігаються — перевірте обидва поля');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { session } = await register(form);
      // Якщо сесія є — людина вже увійшла. Якщо ні — треба підтвердити пошту.
      onSuccess(session);
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
          placeholder="vitya"
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
            placeholder="Віктор"
            autoComplete="given-name"
          />
        </label>

        <label className="field">
          <span className="field-label">Прізвище</span>
          <input
            className="field-input"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Рурак"
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
          placeholder="vitya@example.com"
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
          placeholder="Щонайменше 6 символів"
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
    </form>
  );
}
