// Форма входу. Працює і за логіном, і за електронною поштою —
// див. login() у lib/auth.js.
import { useState } from 'react';
import { login } from '../../lib/auth.js';
import ResendButton from './ResendButton.jsx';

export default function LoginForm({ onSuccess, onForgot }) {
  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Пошту не підтверджено: на яку адресу можна надіслати лист ще раз
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); // не даємо сторінці перезавантажитись

    if (!loginOrEmail.trim() || !password) {
      setError('Заповніть обидва поля');
      return;
    }

    setBusy(true);
    setError('');
    setUnconfirmedEmail(null);
    try {
      await login(loginOrEmail, password);
      onSuccess();
    } catch (e) {
      setError(e.message);
      setUnconfirmedEmail(e.email ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Логін або пошта</span>
        <input
          className="field-input"
          value={loginOrEmail}
          onChange={(e) => {
            setLoginOrEmail(e.target.value);
            setError('');
          }}
          placeholder="ivan.koval або ivan@example.com"
          autoComplete="username"
          autoFocus
        />
      </label>

      <label className="field">
        <span className="field-label">Пароль</span>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete="current-password"
        />
      </label>

      {/* Посилання «Забули пароль?» відкриває форму відновлення */}
      <p className="auth-forgot">
        <button type="button" className="auth-link" onClick={onForgot}>
          Забули пароль?
        </button>
      </p>

      {error && <p className="auth-error">{error}</p>}
      {/* Таймер одразу на нулі: людина могла давно не надсилати лист */}
      {unconfirmedEmail && <ResendButton email={unconfirmedEmail} startCooldown={0} />}

      <button className="btn-primary auth-submit" type="submit" disabled={busy}>
        {busy ? 'Входимо…' : 'Увійти'}
      </button>
    </form>
  );
}
