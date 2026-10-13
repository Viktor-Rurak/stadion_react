// Сторінка «Новий пароль» (/reset-password).
//
// Сюди веде посилання з листа «Відновлення пароля». Supabase сам
// розпізнає посилання і тимчасово впускає людину в акаунт — лишається
// лише задати новий пароль. Посилання одноразове й живе годину.
//
// Якщо зайти сюди вже залогіненим, сторінка теж працює — як «змінити пароль».
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { setNewPassword } from '../lib/auth.js';

// Supabase передає помилку посилання в адресі: #error=...&error_description=...
function readLinkError() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get('error_code') || params.get('error');
  if (!code) return null;
  if (code === 'otp_expired') return 'Посилання з листа застаріло або вже використане.';
  return 'Посилання з листа не спрацювало.';
}

export default function ResetPasswordPage() {
  const { openAuth } = useOutletContext();
  const { user, loading } = useAuth();

  // Помилку з адреси читаємо один раз — і прибираємо її з адресного рядка
  const [linkError] = useState(readLinkError);
  useEffect(() => {
    if (linkError) window.history.replaceState(null, '', window.location.pathname);
  }, [linkError]);

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів');
      return;
    }
    if (password !== repeat) {
      setError('Паролі не збігаються — перевірте обидва поля');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await setNewPassword(password);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // --- Поки Supabase розбирає посилання з листа ---
  if (loading) {
    return (
      <main className="page">
        <p className="empty-note">Перевіряємо посилання…</p>
      </main>
    );
  }

  // --- Пароль змінено ---
  if (done) {
    return (
      <main className="page">
        <h1 className="page-title">Пароль змінено</h1>
        <p className="page-subtitle">
          Ви вже в акаунті. Наступного разу входьте з новим паролем.
        </p>
        <Link to="/booking" className="btn-primary page-cta">Записатися на гру</Link>
      </main>
    );
  }

  // --- Посилання зламане, застаріле або сторінку відкрили без нього ---
  if (linkError || !user) {
    return (
      <main className="page">
        <h1 className="page-title">Відновлення пароля</h1>
        <p className="page-subtitle">
          {linkError ?? 'Щоб задати новий пароль, перейдіть за посиланням із листа.'}{' '}
          Посилання одноразове й діє годину — якщо воно не спрацювало, запросіть новий лист.
        </p>
        <button className="btn-primary page-cta" onClick={() => openAuth('forgot')}>
          Надіслати новий лист
        </button>
      </main>
    );
  }

  // --- Форма нового пароля ---
  return (
    <main className="page">
      <h1 className="page-title">Новий пароль</h1>
      <p className="page-subtitle">
        Для акаунта {user.email}. Придумайте пароль щонайменше з 8 символів.
      </p>

      <section className="step">
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Новий пароль</span>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Щонайменше 8 символів"
              autoComplete="new-password"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Повторіть пароль</span>
            <input
              className="field-input"
              type="password"
              value={repeat}
              onChange={(e) => {
                setRepeat(e.target.value);
                setError('');
              }}
              placeholder="Той самий пароль ще раз"
              autoComplete="new-password"
            />
            {repeat && password !== repeat && (
              <span className="field-hint is-bad">Паролі не збігаються</span>
            )}
          </label>

          {error && <p className="notice is-error">{error}</p>}

          <div className="admin-form-actions">
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Зберігаємо…' : 'Зберегти пароль'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
