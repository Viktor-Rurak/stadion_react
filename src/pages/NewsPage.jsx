// Сторінка «Новини»: список новин для всіх відвідувачів.
// Адмін бачить тут ще й кнопку переходу до адмінпанелі.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { listNews } from '../lib/news.js';
import NewsCard from '../components/news/NewsCard.jsx';

export default function NewsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // alive — щоб не чіпати сторінку, якщо з неї встигли піти
    let alive = true;

    listNews()
      .then((data) => alive && setItems(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Новини</h1>
          <p className="page-subtitle">Що відбувається на стадіоні</p>
        </div>

        {isAdmin && (
          <Link to="/admin/news" className="btn-primary">Додати новину</Link>
        )}
      </div>

      {error && <p className="notice is-error">{error}</p>}

      {loading ? (
        <p className="empty-note">Завантажуємо новини…</p>
      ) : items.length === 0 ? (
        <p className="empty-note">Новин поки немає.</p>
      ) : (
        <div className="news-list">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
