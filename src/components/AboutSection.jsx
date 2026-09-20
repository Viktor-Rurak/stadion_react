// Секція «Про проєкт»: короткий опис і три цифри.
// Цифри описані в data/about.js (PROJECT_STATS).
import { PROJECT_STATS } from '../data/about.js';

export default function AboutSection() {
  return (
    <section id="about" className="section">
      <div className="split-grid">
        <div>
          <h2 className="split-title">Про проєкт</h2>
          <p className="split-text">
            Комплекс утримується на благодійні внески й працює без оплати за
            користування. Кошти йдуть на газон, освітлення та інвентар — не
            на квитки.
          </p>
        </div>

        <div className="stats-grid">
          {PROJECT_STATS.map((stat) => (
            <div key={stat.label} className="stat">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
