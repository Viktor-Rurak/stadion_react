// Форма входу. Працює і за логіном, і за електронною поштою —
// див. login() у lib/auth.js.
import { useState } from 'react';
import { login } from '../lib/auth.js';

export default function LoginForm({ onSuccess }) {
  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); // не даємо сторінці перезавантажитись

    if (!loginOrEmail.trim() || !password) {
      setError('Заповніть обидва поля');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await login(loginOrEmail, password);
      onSuccess();
    } catch (e) {
      setError(e.message);
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
          placeholder="vitya або vitya@example.com"
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

      {error && <p className="auth-error">{error}</p>}

      <button className="btn-primary auth-submit" type="submit" disabled={busy}>
        {busy ? 'Входимо…' : 'Увійти'}
      </button>
    </form>
  );
}
