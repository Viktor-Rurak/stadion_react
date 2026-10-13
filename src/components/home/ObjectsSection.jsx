// Секція «Об'єкти»: сітка карток майданчиків.
// Дані карток лежать у data/objects.js — тут лише розмітка.
import { Link } from 'react-router-dom';
import { OBJECTS } from '../../data/objects.js';
import OccupancyInfo from '../field/OccupancyInfo.jsx';

// Одна картка об'єкта
function ObjectCard({ object }) {
  return (
    <article id={object.id} className="card">
      <h3 className="card-title">{object.name}</h3>
      <p className="card-text">{object.description}</p>
      {/* Майданчик, на який можна записатися, має кнопку запису */}
      {object.bookable && (
        <Link to="/booking" className="btn-small is-primary card-action">
          Записатися
        </Link>
      )}
      {/* Майданчик зі своєю сторінкою (головне поле -> новини) */}
      {object.link && (
        <Link to={object.link} className="btn-small card-action">
          {object.linkText}
        </Link>
      )}
      {/* Майданчик із камерою — скільки людей там зараз */}
      {object.hasCounter && <OccupancyInfo objectKey={object.key} compact />}
    </article>
  );
}

export default function ObjectsSection() {
  return (
    <section id="objects" className="section">
      <div className="section-head">
        <h2 className="section-title">Об&#39;єкти</h2>
      </div>

      <div className="cards-grid">
        {OBJECTS.map((object) => (
          <ObjectCard key={object.key} object={object} />
        ))}
      </div>
    </section>
  );
}
