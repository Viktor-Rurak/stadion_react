// Вікно акаунта: реєстрація та вхід у двох вкладках.
// Відкривається поверх сторінки з кнопки в шапці.
import { useEffect, useState } from 'react';
import RegisterForm from './RegisterForm.jsx';
import LoginForm from './LoginForm.jsx';

export default function AuthModal({ open, onClose, startTab = 'register' }) {
  const [tab, setTab] = useState(startTab);
  // Показуємо після реєстрації, якщо треба підтвердити пошту
  const [confirmEmail, setConfirmEmail] = useState(false);

  // Щоразу при відкритті повертаємо вікно до початкового стану
  useEffect(() => {
    if (open) {
      setTab(startTab);
      setConfirmEmail(false);
    }
  }, [open, startTab]);

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
  function handleRegistered(session) {
    if (session) onClose();
    else setConfirmEmail(true);
  }

  return (
    // Тло навмисно без onClick — клік повз вікно нічого не робить
    <div className="auth-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Акаунт">
        <button className="auth-close" onClick={onClose} aria-label="Закрити">
          &#215;
        </button>

        {confirmEmail ? (
          // --- Екран «підтвердіть пошту» ---
          <div className="auth-done">
            <span className="auth-done-mark">&#10003;</span>
            <h2 className="auth-title">Майже готово</h2>
            <p className="auth-subtitle">
              Ми надіслали лист на вашу пошту. Перейдіть за посиланням у ньому —
              і зможете увійти.
            </p>
            <button className="btn-primary auth-submit" onClick={onClose}>
              Зрозуміло
            </button>
          </div>
        ) : (
          <>
            <div className="auth-head">
              <span className="brand-dot"></span>
              <h2 className="auth-title">
                {tab === 'register' ? 'Створити акаунт' : 'Вхід'}
              </h2>
              <p className="auth-subtitle">
                {tab === 'register'
                  ? 'Реєстрація безкоштовна — вона потрібна лише для запису на майданчики.'
                  : 'Увійдіть, щоб записатися на гру або долучитися до чужої.'}
              </p>
            </div>

            {/* Перемикач вкладок */}
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

            {tab === 'register' ? (
              <RegisterForm onSuccess={handleRegistered} />
            ) : (
              <LoginForm onSuccess={onClose} />
            )}

            <p className="auth-switch">
              {tab === 'register' ? (
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
