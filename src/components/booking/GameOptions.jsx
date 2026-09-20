// Налаштування гри: вид спорту, закрита чи відкрита, коментар.
import { SPORTS } from '../../lib/bookings.js';

export default function GameOptions({ sport, onSportChange, isOpen, onOpenChange, note, onNoteChange }) {
  return (
    <div className="step-stack">
      <label className="field">
        <span className="field-label">Вид спорту</span>
        <select
          className="field-input"
          value={sport}
          onChange={(e) => onSportChange(e.target.value)}
        >
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <div className="field">
        <span className="field-label">Хто гратиме</span>
        <div className="choice-group">
          <button
            type="button"
            className={!isOpen ? 'choice is-active' : 'choice'}
            aria-pressed={!isOpen}
            onClick={() => onOpenChange(false)}
          >
            <span className="choice-title">Закрита гра</span>
            <span className="choice-text">Тільки ваша компанія</span>
          </button>
          <button
            type="button"
            className={isOpen ? 'choice is-active' : 'choice'}
            aria-pressed={isOpen}
            onClick={() => onOpenChange(true)}
          >
            <span className="choice-title">Відкрита гра</span>
            <span className="choice-text">Будь-хто може долучитися</span>
          </button>
        </div>
      </div>

      {/* Коментар потрібен лише тим, хто шукає суперників */}
      {isOpen && (
        <label className="field">
          <span className="field-label">Коментар для тих, хто долучиться</span>
          <input
            className="field-input"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Аматорський рівень, м’яч свій"
            maxLength={200}
          />
        </label>
      )}
    </div>
  );
}
