// Сторінка підтвердження з листа (/auth/confirm).
//
// Кнопки в листах ведуть сюди, а не напряму в Supabase:
//   /auth/confirm?token_hash=…&type=email     — підтвердити пошту після реєстрації
//   /auth/confirm?token_hash=…&type=recovery  — відновити пароль
//
// Навіщо так:
// 1. Посилання в листі веде на сайт стадіону, а не на незрозумілий домен
//    Supabase, — поштові фільтри менше вважають такий лист фішингом.
// 2. Університетські й корпоративні пошти самі «відкривають» посилання з
//    листа, перевіряючи на віруси. Якби підтвердження спрацьовувало від
//    самого відкриття, одноразове посилання згоряло б ще до людини.
//    Тому тут потрібно натиснути кнопку — сканер її не натискає.
import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { verifyEmailLink } from '../lib/auth.js';

// Тексти для кожного виду листа
const KINDS = {
  email: {
    title: 'Підтвердження пошти',
    text: 'Залишився один крок: натисніть кнопку — і акаунт буде готовий.',
    button: 'Підтвердити пошту',
  },
  recovery: {
    title: 'Відновлення пароля',
    text: 'Натисніть кнопку, щоб перейти до сторінки нового пароля.',
    button: 'Задати новий пароль',
  },
};

export default function AuthConfirmPage() {
  const { openAuth } = useOutletContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const tokenHash = params.get('token_hash');
  // Старі листи Supabase могли мати type=signup — це те саме, що email
  const rawType = params.get('type');
  const type = rawType === 'signup' ? 'email' : rawType;
  const kind = KINDS[type];

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await verifyEmailLink(tokenHash, type);
      if (type === 'recovery') {
        // Supabase уже впустив людину в акаунт — лишилось задати пароль
        navigate('/reset-password', { replace: true });
      } else {
        setDone(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // --- Адреса без потрібних даних (обрізане посилання) ---
  if (!tokenHash || !kind) {
    return (
      <main className="page">
        <h1 className="page-title">Посилання не спрацювало</h1>
        <p className="page-subtitle">
          Схоже, посилання з листа скопіювалось не повністю. Відкрийте лист ще раз
          і натисніть кнопку в ньому.
        </p>
        <Link to="/" className="btn-primary page-cta">На головну</Link>
      </main>
    );
  }

  // --- Пошту підтверджено ---
  if (done) {
    return (
      <main className="page">
        <h1 className="page-title">Пошту підтверджено</h1>
        <p className="page-subtitle">
          Ласкаво просимо! Ви вже в акаунті — можна записуватися на корт.
        </p>
        <Link to="/booking" className="btn-primary page-cta">Записатися на гру</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="page-title">{kind.title}</h1>
      <p className="page-subtitle">{kind.text}</p>

      {error ? (
        <>
          <p className="notice is-error confirm-error">{error}</p>
          {type === 'recovery' ? (
            <button className="btn-primary page-cta" onClick={() => openAuth('forgot')}>
              Надіслати новий лист
            </button>
          ) : (
            <button className="btn-primary page-cta" onClick={() => openAuth('login')}>
              Увійти й надіслати лист ще раз
            </button>
          )}
        </>
      ) : (
        <button className="btn-primary page-cta" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Перевіряємо…' : kind.button}
        </button>
      )}
    </main>
  );
}
