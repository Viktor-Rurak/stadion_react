// Вибір дня: сьогодні й кілька наступних.
// На широкому екрані видно всі дні одразу, на телефоні — гортаються вбік.
export default function DayPicker({ days, value, onChange }) {
  return (
    <div className="day-picker">
      {days.map((day) => {
        const active = day.date === value;
        return (
          <button
            key={day.date}
            type="button"
            className={active ? 'day is-active' : 'day'}
            aria-pressed={active}
            onClick={() => onChange(day.date)}
          >
            <span className="day-weekday">{day.isToday ? 'Сьогодні' : day.weekday}</span>
            <span className="day-number">{day.day}</span>
            <span className="day-month">{day.month}</span>
          </button>
        );
      })}
    </div>
  );
}
