// Вікно акаунта: реєстрація та вхід у двох вкладках,
// плюс екран «Забули пароль?» (tab === 'forgot').
// Відкривається поверх сторінки з кнопки в шапці.
import { useEffect, useState } from 'react';
import RegisterForm from './RegisterForm.jsx';
import LoginForm from './LoginForm.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';
import ResendButton from './ResendButton.jsx';
import { cancelSignup } from '../../lib/auth.js';
import { useAuth } from '../../lib/AuthContext.jsx';

// Заголовки й підзаголовки для кожного екрана вікна
const HEADS = {
  register: {
    title: 'Створити акаунт',
    subtitle: 'Реєстрація безкоштовна — вона потрібна лише для запису на майданчики.',
  },
  login: {
    title: 'Вхід',
    subtitle: 'Увійдіть, щоб записатися на гру або долучитися до чужої.',
  },
  forgot: {
    title: 'Відновлення пароля',
    subtitle: 'Надішлемо на пошту лист із посиланням, де можна задати новий пароль.',
  },
};

export default function AuthModal({ open, onClose, startTab = 'register' }) {
  const [tab, setTab] = useState(startTab);
  const { user } = useAuth();

  // Реєстрація чекає на підтвердження пошти: { email, password } або null.
  // Пароль тримаємо лише в пам'яті цього вікна — він потрібен, щоб
  // скасувати реєстрацію, якщо вікно закриють.
  const [pending, setPending] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Щоразу при відкритті повертаємо вікно до початкового стану
  useEffect(() => {
    if (open) {
      setTab(startTab);
      setPending(null);
      setCancelError('');
    }
  }, [open, startTab]);

  // Людина підтвердила пошту в іншій вкладці (з листа) — сайт у цій вкладці
  // дізнається про вхід автоматично, і вікно показує «Пошту підтверджено»
  const confirmed = Boolean(pending && user);

  // Поки вікно відкрите — блокуємо прокрутку сторінки під ним.
  // Закрити вікно можна ЛИШЕ хрестиком: ані клік повз нього,
  // ані клавіша Esc його не закривають, щоб випадково
  // не втратити заповнену форму.
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  // Реєстрація вдалася: якщо сесія є — людина вже в системі,
  // якщо ні — Supabase надіслав лист для підтвердження пошти
  function handleRegistered(session, credentials) {
    if (session) onClose();
    else setPending(credentials);
  }

  // Хрестик. Якщо пошту ще не підтверджено — реєстрацію скасовуємо
  // (акаунт видаляється), щоб людина не застрягла з акаунтом, у який не
  // можна увійти, і могла зареєструватися знову.
  async function handleClose() {
    if (!pending || confirmed) {
      onClose();
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await cancelSignup(pending.email, pending.password);
      onClose();
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  const head = HEADS[tab] ?? HEADS.login;

  return (
    // Тло навмисно без onClick — клік повз вікно нічого не робить
    <div className="auth-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Акаунт">
        <button
          className="auth-close"
          onClick={handleClose}
          disabled={cancelling}
          aria-label={pending && !confirmed ? 'Скасувати реєстрацію й закрити' : 'Закрити'}
        >
          &#215;
        </button>

        {confirmed ? (
          // --- Пошту підтверджено (в іншій вкладці, з листа) ---
          <div className="auth-done">
            <span className="auth-done-mark">&#10003;</span>
            <h2 className="auth-title">Пошту підтверджено</h2>
            <p className="auth-subtitle">Акаунт готовий — ви вже на сайті.</p>
            <button className="btn-primary auth-submit" onClick={onClose}>
              Чудово
            </button>
          </div>
        ) : pending ? (
          // --- Чекаємо, поки людина натисне кнопку в листі ---
          <div className="auth-done">
            <span className="auth-done-mark">&#9993;</span>
            <h2 className="auth-title">Майже готово</h2>
            <p className="auth-subtitle">
              Ми надіслали лист на <strong>{pending.email}</strong>. Відкрийте його й
              натисніть «Підтвердити пошту». Лист може йти кілька хвилин —
              перевірте й папку «Спам».
            </p>

            <ResendButton email={pending.email} />

            <p className="auth-warning">
              Не закривайте це вікно, доки не підтвердите пошту: якщо закрити,
              реєстрацію буде скасовано і доведеться почати спочатку.
            </p>

            {cancelError && <p className="auth-error">{cancelError}</p>}
            <button
              className="auth-link auth-cancel"
              onClick={handleClose}
              disabled={cancelling}
            >
              {cancelling ? 'Скасовуємо…' : 'Помилились у пошті? Скасувати реєстрацію'}
            </button>
          </div>
        ) : (
          <>
            <div className="auth-head">
              <span className="brand-dot"></span>
              <h2 className="auth-title">{head.title}</h2>
              <p className="auth-subtitle">{head.subtitle}</p>
            </div>

            {/* Перемикач вкладок (на екрані відновлення пароля не потрібен) */}
            {tab !== 'forgot' && (
              <div className="auth-tabs">
                <button
                  className={tab === 'register' ? 'auth-tab is-active' : 'auth-tab'}
                  onClick={() => setTab('register')}
                >
                  Реєстрація
                </button>
                <button
                  className={tab === 'login' ? 'auth-tab is-active' : 'auth-tab'}
                  onClick={() => setTab('login')}
                >
                  Вхід
                </button>
              </div>
            )}

            {tab === 'register' && <RegisterForm onSuccess={handleRegistered} />}
            {tab === 'login' && (
              <LoginForm onSuccess={onClose} onForgot={() => setTab('forgot')} />
            )}
            {tab === 'forgot' && <ForgotPasswordForm onBack={() => setTab('login')} />}

            <p className="auth-switch">
              {tab === 'forgot' ? (
                <>
                  Згадали пароль?{' '}
                  <button className="auth-link" onClick={() => setTab('login')}>
                    Увійти
                  </button>
                </>
              ) : tab === 'register' ? (
                <>
                  Вже маєте акаунт?{' '}
                  <button className="auth-link" onClick={() => setTab('login')}>
                    Увійти
                  </button>
                </>
              ) : (
                <>
                  Ще немає акаунта?{' '}
                  <button className="auth-link" onClick={() => setTab('register')}>
                    Зареєструватися
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
