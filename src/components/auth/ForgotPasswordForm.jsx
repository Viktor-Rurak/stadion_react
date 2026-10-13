// Форма «Забули пароль?»: людина вводить пошту — ми надсилаємо лист
// із посиланням на сторінку /reset-password.
import { useState } from 'react';
import { requestPasswordReset } from '../../lib/auth.js';

export default function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Лист відправлено. Навмисно не кажемо, чи є такий акаунт, —
  // інакше форму можна використати, щоб перевіряти чужі адреси.
  if (sent) {
    return (
      <div className="auth-form">
        <p className="notice is-success">
          Якщо акаунт із поштою {email.trim()} існує, ми надіслали на неї лист із
          посиланням. Перейдіть за ним, щоб задати новий пароль. Лист може йти
          кілька хвилин — перевірте й папку «Спам».
        </p>
        <button type="button" className="btn-primary auth-submit" onClick={onBack}>
          Повернутися до входу
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Пошта, вказана під час реєстрації</span>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder="ivan@example.com"
          autoComplete="email"
          autoFocus
        />
        <span className="field-hint">
          Саме пошта, не логін: на неї прийде лист із посиланням.
        </span>
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button className="btn-primary auth-submit" type="submit" disabled={busy}>
        {busy ? 'Надсилаємо…' : 'Надіслати лист'}
      </button>
    </form>
  );
}
