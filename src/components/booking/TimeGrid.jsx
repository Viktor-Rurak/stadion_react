// Сітка часу на обраний день: кожна клітинка — пів години.
//
// Стани клітинки:
//   вільно       — можна натиснути й почати гру з цього часу;
//   зайнято      — хтось уже грає (перекреслено);
//   замало часу  — вільно, але гра обраної тривалості звідси не влізе:
//                  далі вже зайнято або корт закривається о 24:00.
//                  Натискання показує пояснення;
//   минуло       — сьогоднішній час, який уже настав.
import {
  OPEN_FROM,
  OPEN_TILL,
  SLOT_MINUTES,
  minutesToTime,
  isBusyAt,
  canStartAt,
} from '../../lib/bookings.js';

// Усі півгодинні клітинки дня: 06:00, 06:30 … 23:30
const SLOTS = [];
for (let minute = OPEN_FROM; minute < OPEN_TILL; minute += SLOT_MINUTES) {
  SLOTS.push(minute);
}

export default function TimeGrid({ games, hours, start, nowMinutes, loading, onPick, onExplain }) {
  const gameLength = hours * 60;
  const anyAvailable = SLOTS.some((minute) => canStartAt(minute, hours, games, nowMinutes));

  return (
    <>
      <div className={loading ? 'time-grid is-loading' : 'time-grid'}>
        {SLOTS.map((minute) => {
          // Чи входить клітинка в обраний проміжок гри
          const selected = start !== null && minute >= start && minute < start + gameLength;

          let state = 'free';
          if (minute < nowMinutes) state = 'past';
          else if (isBusyAt(minute, games)) state = 'busy';
          else if (!canStartAt(minute, hours, games, nowMinutes)) state = 'tight';

          const classes = ['time-slot', 'is-' + state];
          if (selected) classes.push('is-selected');

          return (
            <button
              key={minute}
              type="button"
              className={classes.join(' ')}
              // Зайняте й минуле натиснути не можна; «замало часу» — можна,
              // щоб людина побачила пояснення
              disabled={state === 'busy' || state === 'past'}
              aria-pressed={selected}
              onClick={() => (state === 'tight' ? onExplain(minute) : onPick(minute))}
            >
              {minutesToTime(minute)}
            </button>
          );
        })}
      </div>

      {!loading && !anyAvailable && (
        <p className="step-note">
          Вільного часу під таку тривалість на цей день немає — спробуйте
          коротшу гру або інший день.
        </p>
      )}

      <div className="legend">
        <span className="legend-item"><span className="legend-swatch is-free"></span>вільно</span>
        <span className="legend-item"><span className="legend-swatch is-busy"></span>зайнято</span>
        <span className="legend-item"><span className="legend-swatch is-tight"></span>замало часу на {hours} год</span>
        <span className="legend-item"><span className="legend-swatch is-selected"></span>ваш час</span>
      </div>
    </>
  );
}
