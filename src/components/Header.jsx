// Шапка сайту: логотип, меню, кнопка акаунта та кнопка запису.
// Однакова на всіх сторінках і «прилипає» до верху екрана.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { logout } from '../lib/auth.js';

export default function Header({ onOpenAuth }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  // Перейшли на іншу сторінку — закриваємо меню акаунта
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Стадіон — на головну">
        <span className="brand-dot"></span>
        <span className="brand-name">Стадіон</span>
      </Link>

      {/* /#objects — перейти на головну й прокрутити до секції */}
      <nav className="nav">
        <Link to="/news">Новини</Link>
        <Link to="/#objects">Об&#39;єкти</Link>
        <Link to="/#about">Про проєкт</Link>
        <Link to="/#contacts">Контакти</Link>
      </nav>

      <div className="topbar-actions">
        {/* Поки перевіряємо сесію — не блимаємо кнопками */}
        {loading ? null : user ? (
          // --- Користувач увійшов: ім'я з випадаючим меню ---
          <div className="account" ref={accountRef}>
            <button
              className="account-btn"
              onClick={() => setMenuOpen((v) => !v)}
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
                  <Link className="account-menu-item" to="/admin/news">
                    Адмінпанель новин
                  </Link>
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
          <Link to="/booking" className="btn-primary">Записатися</Link>
        )}
      </div>
    </header>
  );
}
