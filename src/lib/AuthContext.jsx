// Спільний стан «хто зараз увійшов на сайт».
//
// Навіщо: і шапка (щоб показати ім'я), і вікно входу мають знати
// одне й те саме. Замість передавати дані через десяток компонентів,
// кладемо їх сюди — і будь-який компонент бере їх через useAuth().
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { getMyProfile } from './auth.js';

// Значення за замовчуванням: якщо компонент з якоїсь причини опинився
// поза AuthProvider, сайт покаже його як для гостя, а не впаде з помилкою
const AuthContext = createContext({ user: null, profile: null, loading: true, isAdmin: false });

/** Огортає весь сайт (див. main.jsx) і роздає дані про користувача */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // дані входу (пошта, id)
  const [profile, setProfile] = useState(null); // логін, ім'я, телефон
  const [loading, setLoading] = useState(true); // поки перевіряємо сесію

  useEffect(() => {
    // 1. Перевіряємо, чи користувач уже входив раніше в цьому браузері
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2. Слухаємо зміни: вхід, вихід, оновлення сесії
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Прибираємо за собою, коли компонент зникає
    return () => data.subscription.unsubscribe();
  }, []);

  // Щойно користувач змінився — підвантажуємо його профіль
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null)); // профіль не критичний
  }, [user]);

  return (
    // isAdmin — зручне скорочення: це адмінакаунт чи звичайний
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.is_admin === true }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Хук для будь-якого компонента:
 *   const { user, profile } = useAuth();
 * user === null означає «не увійшов».
 */
export function useAuth() {
  return useContext(AuthContext);
}
