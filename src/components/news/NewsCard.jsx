// Одна новина: фото, дата, заголовок і текст.
// В адмінпанелі до неї додаються кнопки «Редагувати» та «Видалити».
import { useState } from 'react';
import { formatNewsDate } from '../../lib/news.js';

export default function NewsCard({ item, onEdit, onDelete, busy }) {
  const [asking, setAsking] = useState(false);

  return (
    <article className="news-card">
      {item.image_url && (
        <img className="news-image" src={item.image_url} alt="" loading="lazy" />
      )}

      <div className="news-body">
        <span className="news-date">{formatNewsDate(item.created_at)}</span>
        <h3 className="news-title">{item.title}</h3>
        {/* Текст показуємо як є: абзаци зберігає стиль white-space: pre-line */}
        <p className="news-text">{item.body}</p>

        {(onEdit || onDelete) && (
          <div className="news-actions">
            {asking ? (
              // Підтвердження просимо прямо тут, а не системним вікном браузера
              <div className="confirm-inline">
                <span className="confirm-question">Видалити новину?</span>
                <button
                  type="button"
                  className="btn-small is-danger"
                  disabled={busy}
                  onClick={() => {
                    setAsking(false);
                    onDelete();
                  }}
                >
                  Так, видалити
                </button>
                <button type="button" className="btn-small" onClick={() => setAsking(false)}>
                  Ні
                </button>
              </div>
            ) : (
              <>
                {onEdit && (
                  <button type="button" className="btn-small" disabled={busy} onClick={onEdit}>
                    Редагувати
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="btn-small"
                    disabled={busy}
                    onClick={() => setAsking(true)}
                  >
                    Видалити
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
