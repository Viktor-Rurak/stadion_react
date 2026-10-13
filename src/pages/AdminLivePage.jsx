// Адмінпанель трансляції: увімкнути її на сайті й вказати, що показувати.
//
// Саме відео сюди не потрапляє: його забирає з камери й віддає в YouTube
// окрема програма на сервері (папка camera-stream). Тут лише адреса плеєра.
//
// Сторінка відкривається лише адмінам, але головний захист — у базі:
// політики не дадуть записати нічого навіть в обхід цієї сторінки.
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { getStream, saveStream } from '../lib/live.js';
import LivePlayer from '../components/field/LivePlayer.jsx';

// Поки трансляція одна — зі штучного поля
const OBJECT_KEY = 'train';

export default function AdminLivePage() {
  const { openAuth } = useOutletContext();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [channelId, setChannelId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [saved, setSaved] = useState(0); // щоб перемалювати плеєр після збереження

  useEffect(() => {
    let alive = true;

    getStream(OBJECT_KEY)
      .then((row) => {
        if (!alive || !row) return;
        setChannelId(row.youtube_channel_id ?? '');
        setVideoId(row.youtube_video_id ?? '');
        setEnabled(row.enabled);
      })
      .catch((e) => alive && setMessage({ type: 'error', text: e.message }))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const row = await saveStream(OBJECT_KEY, { channelId, videoId, enabled });
      setChannelId(row.youtube_channel_id ?? '');
      setVideoId(row.youtube_video_id ?? '');
      setMessage({
        type: 'success',
        text: row.enabled ? 'Збережено — трансляція на сайті.' : 'Збережено — трансляцію вимкнено.',
      });
      setSaved((n) => n + 1);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  // --- Хто не адмін, далі не проходить ---

  if (authLoading) {
    return (
      <main className="page">
        <p className="empty-note">Хвилинку…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page-title">Трансляція</h1>
        <p className="page-subtitle">Щоб потрапити сюди, увійдіть в адмінакаунт.</p>
        <button className="btn-primary page-cta" onClick={() => openAuth('login')}>
          Увійти
        </button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page">
        <h1 className="page-title">Тільки для адміністраторів</h1>
        <p className="page-subtitle">
          Ваш акаунт не має прав адміністратора. Якщо це помилка — зверніться
          до власника сайту.
        </p>
        <Link to="/" className="btn-primary page-cta">На головну</Link>
      </main>
    );
  }

  // --- Сама панель ---

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Трансляція зі штучного поля</h1>
          <p className="page-subtitle">
            Відео на YouTube подає сервер. Тут ви вмикаєте плеєр на сайті
            й кажете, звідки його брати.
          </p>
        </div>
        <Link to="/fields/train" className="btn-small">Подивитись сторінку</Link>
      </div>

      {message && <p className={`notice is-${message.type}`}>{message.text}</p>}

      <section className="step">
        <h2 className="step-title">Налаштування</h2>

        {loading ? (
          <p className="empty-note">Завантажуємо…</p>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Канал YouTube</span>
              <input
                className="field-input"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="UC… або посилання на канал"
                disabled={busy}
              />
              <span className="field-hint">
                Так сайт сам показує те, що зараз в етері на каналі. Це звичайний
                спосіб: адресу не доводиться міняти після кожного перезапуску.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Окрема трансляція (необов&#39;язково)</span>
              <input
                className="field-input"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="Посилання на трансляцію YouTube"
                disabled={busy}
              />
              <span className="field-hint">
                Якщо заповнити, сайт показуватиме саме цю трансляцію, а не канал.
              </span>
            </label>

            <label className="live-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={busy}
              />
              <span>Показувати трансляцію на сайті</span>
            </label>

            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Зберігаю…' : 'Зберегти'}
            </button>
          </form>
        )}
      </section>

      <section className="step">
        <h2 className="step-title">Як це бачать відвідувачі</h2>
        <LivePlayer key={saved} objectKey={OBJECT_KEY} />
      </section>
    </main>
  );
}
