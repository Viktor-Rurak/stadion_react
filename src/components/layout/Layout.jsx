// Каркас, спільний для всіх сторінок: шапка, вміст сторінки, підвал
// і вікно входу/реєстрації, яке можна відкрити з будь-якої сторінки.
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import AuthModal from '../auth/AuthModal.jsx';

export default function Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('register');
  const { pathname, hash } = useLocation();

  // tab — з якого екрана почати: 'register', 'login' чи 'forgot' (забули пароль)
  function openAuth(tab = 'register') {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  // Нова сторінка відкривається згори. Якщо в адресі є #якір
  // (наприклад, /#about), до потрібного місця прокрутить сама сторінка.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="app">
      <Header onOpenAuth={openAuth} />

      {/* Поки React підвантажує сторінку, показуємо заглушку */}
      <Suspense fallback={<main className="page-loading">Завантаження…</main>}>
        {/* context — те, що сторінка може взяти через useOutletContext() */}
        <Outlet context={{ openAuth }} />
      </Suspense>

      <Footer />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} startTab={authTab} />
    </div>
  );
}
