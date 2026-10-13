// Шапка сайту: логотип, меню, кнопка акаунта та кнопка запису.
// Однакова на всіх сторінках і «прилипає» до верху екрана.
// На телефоні меню ховається за кнопкою-«бургером» (три риски).
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { logout } from '../../lib/auth.js';

export default function Header({ onOpenAuth }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // мобільне меню
  const accountRef = useRef(null);
  const headerRef = useRef(null);

  // Перейшли на іншу сторінку — закриваємо обидва меню
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [pathname]);

  // Мобільне меню закривається кліком повз шапку або клавішею Esc
  useEffect(() => {
    if (!navOpen) return;

    function onClickOutside(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) setNavOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  // Закриваємо випадаюче меню, коли клікнули повз нього
  useEffect(() => {
    if (!menuOpen) return;

    function onClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  // Що показати на кнопці акаунта: ім'я, логін або початок пошти
  const displayName =
    profile?.first_name?.trim() || profile?.login || user?.email?.split('@')[0] || 'Акаунт';

  return (
    <header className={navOpen ? 'topbar is-nav-open' : 'topbar'} ref={headerRef}>
      <Link to="/" className="brand" aria-label="Стадіон — на головну">
        <span className="brand-dot"></span>
        <span className="brand-name">Стадіон</span>
      </Link>

      {/* /#objects — перейти на головну й прокрутити до секції */}
      {/* На телефоні це меню випадає з-під шапки, коли натиснули «бургер».
          Клік по пункту закриває його (якорі не змінюють сторінку). */}
      <nav id="site-nav" className="nav" onClick={(e) => e.target.closest('a') && setNavOpen(false)}>
        <Link to="/news">Новини</Link>
        <Link to="/#objects">Об&#39;єкти</Link>
        <Link to="/#about">Як це працює</Link>
        <Link to="/#contacts">Контакти</Link>
        {pathname !== '/booking' && (
          <Link to="/booking" className="btn-primary nav-booking">Записатися</Link>
        )}
      </nav>

      <div className="topbar-actions">
        {/* Поки перевіряємо сесію — не блимаємо кнопками */}
        {loading ? null : user ? (
          // --- Користувач увійшов: ім'я з випадаючим меню ---
          <div className="account" ref={accountRef}>
            <button
              className="account-btn"
              onClick={() => {
                setMenuOpen((v) => !v);
                setNavOpen(false);
              }}
              aria-expanded={menuOpen}
            >
              <span className="account-avatar">{displayName[0].toUpperCase()}</span>
              <span className="account-name">{displayName}</span>
            </button>

            {menuOpen && (
              <div className="account-menu">
                <div className="account-menu-head">
                  <span className="account-menu-name">
                    {profile ? `${profile.first_name} ${profile.last_name}`.trim() : displayName}
                  </span>
                  <span className="account-menu-mail">{user.email}</span>
                  {isAdmin && <span className="account-menu-role">Адмінакаунт</span>}
                </div>

                {/* Адмінам — швидкий шлях до керування новинами */}
                {isAdmin && (
                  <>
                    <Link className="account-menu-item" to="/admin/news">
                      Адмінпанель новин
                    </Link>
                    <Link className="account-menu-item" to="/admin/live">
                      Трансляція
                    </Link>
                  </>
                )}

                <button
                  className="account-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  Вийти
                </button>
              </div>
            )}
          </div>
        ) : (
          // --- Гість: кнопка входу ---
          <button className="btn-ghost" onClick={() => onOpenAuth('login')}>
            Увійти
          </button>
        )}

        {/* На самій сторінці запису ця кнопка зайва */}
        {pathname !== '/booking' && (
          <Link to="/booking" className="btn-primary topbar-booking">Записатися</Link>
        )}

        {/* «Бургер» — видно лише на вузьких екранах */}
        <button
          className="burger"
          onClick={() => {
            setNavOpen((v) => !v);
            setMenuOpen(false);
          }}
          aria-expanded={navOpen}
          aria-controls="site-nav"
          aria-label={navOpen ? 'Закрити меню' : 'Відкрити меню'}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
