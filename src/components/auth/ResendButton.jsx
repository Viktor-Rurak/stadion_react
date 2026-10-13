// Кнопка «Надіслати лист ще раз» із таймером.
//
// Supabase дозволяє один лист на хвилину для однієї людини, тому кнопка
// після кожної відправки «засинає» на 60 секунд і показує зворотний відлік.
// Використовується у вікні «Майже готово» та у формі входу.
import { useEffect, useState } from 'react';
import { resendConfirmation } from '../../lib/auth.js';

const COOLDOWN_SECONDS = 60;

export default function ResendButton({ email, startCooldown = COOLDOWN_SECONDS }) {
  const [left, setLeft] = useState(startCooldown); // скільки секунд ще чекати
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  // Відлік: щосекунди мінус одна
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  async function handleClick() {
    setBusy(true);
    setMessage(null);
    try {
      await resendConfirmation(email);
      setMessage({ type: 'success', text: `Лист надіслано на ${email}. Перевірте й папку «Спам».` });
      setLeft(COOLDOWN_SECONDS);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
      if (e.retryAfter) setLeft(e.retryAfter);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="resend">
      <button
        type="button"
        className="btn-small resend-button"
        onClick={handleClick}
        disabled={busy || left > 0}
      >
        {busy
          ? 'Надсилаємо…'
          : left > 0
            ? `Надіслати ще раз через ${left} с`
            : 'Надіслати лист ще раз'}
      </button>
      {message && <p className={`notice is-${message.type}`}>{message.text}</p>}
    </div>
  );
}
