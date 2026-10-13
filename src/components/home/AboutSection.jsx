// Секція «Як це працює»: інструкція для відвідувачів.
// Самі тексти — у data/about.js, тут лише розмітка.
import { HOW_STEPS, PLACES } from '../../data/about.js';

export default function AboutSection() {
  return (
    // id="about" лишився з давніх часів: на нього веде посилання в шапці
    <section id="about" className="section">
      <div className="section-head">
        <h2 className="section-title">Як це працює</h2>
      </div>

      <p className="about-lead">
        Комплекс утримується на благодійні внески, тому грати тут безкоштовно.
        Записатися можна лише на універсальний корт — решта майданчиків просто
        відкриті для всіх.
      </p>

      {/* Чотири кроки: від реєстрації до гри */}
      <ol className="how-steps">
        {HOW_STEPS.map((step, index) => (
          <li key={step.title} className="how-step">
            <span className="how-number">{index + 1}</span>
            <div>
              <h3 className="how-title">{step.title}</h3>
              <p className="how-text">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Що на території за що відповідає */}
      <div className="about-places">
        {PLACES.map((place) => (
          <div key={place.title} className="about-place">
            <h3 className="how-title">{place.title}</h3>
            <p className="how-text">{place.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
