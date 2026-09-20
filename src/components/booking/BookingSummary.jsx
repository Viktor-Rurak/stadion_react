// Підсумок вибору та кнопка «Записатися».
// На комп'ютері — картка праворуч, на телефоні — панель унизу екрана.
export default function BookingSummary({
  dayLabel,
  startTime,
  endTime,
  sportText,
  isOpen,
  blocked,
  isGuest,
  busy,
  notice,
  onSubmit,
}) {
  const ready = startTime !== null;

  return (
    <div className="summary">
      {notice && <p className={`notice is-${notice.type}`}>{notice.text}</p>}

      <div className="summary-main">
        <div className="summary-info">
          <span className="summary-label">Ваш вибір</span>

          {blocked ? (
            <>
              <span className="summary-value">Гра на цей день уже є</span>
              <span className="summary-sub">{dayLabel}</span>
            </>
          ) : ready ? (
            <>
              <span className="summary-value">{startTime}–{endTime}</span>
              <span className="summary-sub">
                {dayLabel} · {sportText} · {isOpen ? 'відкрита гра' : 'закрита гра'}
              </span>
            </>
          ) : (
            <>
              <span className="summary-value is-empty">Оберіть час</span>
              <span className="summary-sub">{dayLabel}</span>
            </>
          )}
        </div>

        {!blocked && (
          <button
            type="button"
            className="btn-primary summary-button"
            disabled={!ready || busy}
            onClick={onSubmit}
          >
            {busy ? 'Записуємо…' : 'Записатися'}
          </button>
        )}
      </div>

      {isGuest && !blocked && (
        <p className="summary-hint">
          Для запису потрібен акаунт — попросимо увійти вже після того, як оберете час.
        </p>
      )}
    </div>
  );
}
