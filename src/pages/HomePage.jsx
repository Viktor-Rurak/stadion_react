// Головна сторінка: план території, об'єкти, про проєкт.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PlanMap from '../components/home/PlanMap.jsx';
import ObjectsSection from '../components/home/ObjectsSection.jsx';
import AboutSection from '../components/home/AboutSection.jsx';

export default function HomePage() {
  const { hash, key } = useLocation();

  // Посилання на кшталт /#about: прокручуємо до потрібної секції.
  // key змінюється при кожному переході — тож повторний клік теж спрацює.
  useEffect(() => {
    const id = hash.slice(1);
    // Після переходу з листа адреса має вигляд #access_token=… — це не секція.
    // Без цієї перевірки querySelector падав із помилкою, і сторінка ставала білою.
    if (!/^[\w-]+$/.test(id)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
