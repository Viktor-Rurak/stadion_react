// Головна сторінка: план території, об'єкти, про проєкт.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PlanMap from '../components/PlanMap.jsx';
import ObjectsSection from '../components/ObjectsSection.jsx';
import AboutSection from '../components/AboutSection.jsx';

export default function HomePage() {
  const { hash, key } = useLocation();

  // Посилання на кшталт /#about: прокручуємо до потрібної секції.
  // key змінюється при кожному переході — тож повторний клік теж спрацює.
  useEffect(() => {
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, key]);

  return (
    <main>
      {/* Заголовок для екранних читалок і пошуковиків; на екрані його не видно */}
      <h1 className="visually-hidden">Стадіон — спортивний комплекс Дубівці</h1>
      <PlanMap />
      <ObjectsSection />
      <AboutSection />
    </main>
  );
}
