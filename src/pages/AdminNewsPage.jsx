// Адмінпанель новин: написати новину, змінити або видалити.
//
// Сторінка відкривається лише адмінам. Але головний захист не тут, а в базі:
// навіть якщо хтось обійде цю перевірку, політики не дадуть нічого записати.
import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { listNews, createNews, updateNews, deleteNews } from '../lib/news.js';
import NewsForm from '../components/news/NewsForm.jsx';
import NewsCard from '../components/news/NewsCard.jsx';

export default function AdminNewsPage() {
  const { openAuth } = useOutletContext(); // з Layout: відкрити вікно входу
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // чекаємо відповідь сервера
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [editing, setEditing] = useState(null); // яку новину зараз правимо

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listNews());
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(form) {
    setBusy(true);
    setMessage(null);
    try {
      if (editing) {
        await updateNews(editing.id, form);
        setMessage({ type: 'success', text: 'Новину оновлено.' });
        setEditing(null);
      } else {
        await createNews(form);
        setMessage({ type: 'success', text: 'Новину опубліковано.' });
      }
      await load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteNews(item.id);
      if (editing?.id === item.id) setEditing(null);
      setMessage({ type: 'success', text: 'Новину видалено.' });
      await load();
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
        <h1 className="page-title">Адмінпанель новин</h1>
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
        <Link to="/news" className="btn-primary page-cta">До новин</Link>
      </main>
    );
  }

  // --- Сама панель ---

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Адмінпанель новин</h1>
          <p className="page-subtitle">
            Напишіть текст, за бажання додайте фото — новина одразу з&#39;явиться
            на сторінці «Новини».
          </p>
        </div>
        <Link to="/news" className="btn-small">Подивитись сторінку</Link>
      </div>

      {message && <p className={`notice is-${message.type}`}>{message.text}</p>}

      <section className="step">
        <h2 className="step-title">{editing ? 'Редагування новини' : 'Нова новина'}</h2>
        <NewsForm
          editing={editing}
          busy={busy}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section className="step">
        <h2 className="step-title">Опубліковані новини</h2>

        {loading ? (
          <p className="empty-note">Завантажуємо…</p>
        ) : items.length === 0 ? (
          <p className="empty-note">Новин поки немає — напишіть першу.</p>
        ) : (
          <div className="news-list is-compact">
            {items.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                busy={busy}
                onEdit={() => {
                  setEditing(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
