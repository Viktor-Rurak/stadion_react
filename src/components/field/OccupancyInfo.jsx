// Скільки людей зараз на полі — за даними камери.
// compact — маленький варіант для картки на головній.
import { useOccupancy, peopleWord, agoText } from '../../lib/occupancy.js';

export default function OccupancyInfo({ objectKey, compact = false }) {
  const { count, minutesAgo, fresh, loading } = useOccupancy(objectKey);
  const classes = compact ? 'occupancy is-compact' : 'occupancy';

  if (loading) {
    return (
      <div className={classes}>
        <span className="occupancy-note">Рахуємо людей на полі…</span>
      </div>
    );
  }

  // Лічильник мовчить — старе число не показуємо, щоб не вводити в оману
  if (!fresh) {
    return (
      <div className={`${classes} is-unknown`}>
        <span className="occupancy-note">Дані з камери зараз недоступні</span>
      </div>
    );
  }

  return (
    <div className={classes}>
      <span className="occupancy-number">{count}</span>
      <span className="occupancy-text">
        <span className="occupancy-main">
          {count === 0 ? 'Поле зараз вільне' : `${peopleWord(count)} на полі`}
        </span>
        <span className="occupancy-note">за даними камери · {agoText(minutesAgo)}</span>
      </span>
    </div>
  );
}
