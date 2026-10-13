// Сторінка майданчика (/fields/train тощо): опис, а якщо на полі стоїть
// камера — трансляція і скільки людей зараз на полі.
import { Link, useParams } from 'react-router-dom';
import { OBJECTS } from '../data/objects.js';
import OccupancyInfo from '../components/field/OccupancyInfo.jsx';
import LivePlayer from '../components/field/LivePlayer.jsx';

export default function FieldPage() {
  const { key } = useParams();
  const object = OBJECTS.find((o) => o.key === key);

  if (!object) {
    return (
      <main className="page-loading">
        <p>Такого майданчика немає.</p>
        <Link to="/" className="btn-primary">На головну</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{object.name}</h1>
          <p className="page-subtitle">{object.labelSubtitle}</p>
        </div>
      </div>

      {object.hasStream && (
        <section className="step">
          <h2 className="step-title">Трансляція з поля</h2>
          <LivePlayer objectKey={object.key} />
        </section>
      )}

      {object.hasCounter && (
        <section className="step">
          <h2 className="step-title">Зараз на полі</h2>
          <OccupancyInfo objectKey={object.key} />
          <p className="step-note">
            Камера рахує людей раз на хвилину. Самі знімки нікуди не передаються —
            на сайт приходить лише число.
          </p>
        </section>
      )}

      <section className="step">
        <h2 className="step-title">Про майданчик</h2>
        <p className="field-description">{object.description}</p>
        {object.bookable && (
          <Link to="/booking" className="btn-primary page-cta">Записатися</Link>
        )}
      </section>
    </main>
  );
}
