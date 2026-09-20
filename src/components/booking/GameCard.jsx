// Картка однієї гри: час, вид спорту, організатор і кнопка дії.
//
// Для незворотних дій (скасувати гру, вийти з неї) картка спершу питає
// «Точно?» прямо в собі. Системне вікно браузера (window.confirm) тут не
// годиться: у деяких браузерах воно заблоковане й мовчки відповідає «ні».
import { useState } from 'react';
import { formatTime, sportLabel } from '../../lib/bookings.js';

export default function GameCard({
  game,
  highlight,
  actionLabel,
  actionKind,
  disabled,
  onAction,
  confirmQuestion, // якщо задано — перед дією питаємо підтвердження
  confirmLabel = 'Так',
}) {
  const [asking, setAsking] = useState(false);
  const full = game.free_slots <= 0;

  function handleAction() {
    if (confirmQuestion) setAsking(true);
    else onAction();
  }

  return (
    <article className={highlight ? 'game-card is-mine' : 'game-card'}>
      <div className="game-card-main">
        <span className="game-card-time">
          {formatTime(game.start_time)}–{formatTime(game.end_time)}
        </span>
        <span className="game-card-meta">
          {sportLabel(game.sport)}
          {/* Імена бачать лише ті, хто увійшов */}
          {game.organizer_name ? ` · організатор ${game.organizer_name}` : ''}
        </span>
        {game.note && <span className="game-card-note">{game.note}</span>}
      </div>

      <div className="game-card-side">
        {asking ? (
          // --- Питаємо підтвердження прямо в картці ---
          <div className="confirm-inline">
            <span className="confirm-question">{confirmQuestion}</span>
            <button
              type="button"
              className="btn-small is-danger"
              disabled={disabled}
              onClick={() => {
                setAsking(false);
                onAction();
              }}
            >
              {confirmLabel}
            </button>
            <button type="button" className="btn-small" onClick={() => setAsking(false)}>
              Ні
            </button>
          </div>
        ) : (
          <>
            {game.is_open ? (
              <span className={full ? 'badge is-muted' : 'badge'}>
                {full ? 'Місць немає' : `Вільно ${game.free_slots}`}
              </span>
            ) : (
              <span className="badge is-muted">Закрита</span>
            )}

            {actionLabel && (
              <button
                type="button"
                className={actionKind === 'primary' ? 'btn-small is-primary' : 'btn-small'}
                disabled={disabled}
                onClick={handleAction}
              >
                {actionLabel}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
