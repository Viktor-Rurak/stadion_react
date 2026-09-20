// Карта сайту: яка адреса — яка сторінка.
//
//   /          — головна: план території, об'єкти, про проєкт
//   /booking    — запис на корт
//   /news       — новини стадіону
//   /admin/news — адмінпанель новин (лише для адмінів)
//
// Шапку, підвал і вікно входу для всіх сторінок малює Layout.
import { lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';

// Сторінку запису React підвантажує окремим файлом лише тоді,
// коли людина на неї переходить, — головна від цього відкривається швидше.
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const NewsPage = lazy(() => import('./pages/NewsPage.jsx'));
const AdminNewsPage = lazy(() => import('./pages/AdminNewsPage.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="admin/news" element={<AdminNewsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// Сторінка для адреси, якої не існує
function NotFound() {
  return (
    <main className="page-loading">
      <p>Такої сторінки немає.</p>
      <Link to="/" className="btn-primary">На головну</Link>
    </main>
  );
}
