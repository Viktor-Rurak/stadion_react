// Скільки людей зараз на полі.
//
// Число надсилає програма-лічильник на комп'ютері стадіону (папка camera-counter):
// раз на хвилину вона бере знімок із камери, рахує людей нейромережею
// й передає на сайт ЛИШЕ кількість — самі знімки нікуди не йдуть.
// Записати число може лише пристрій із секретним ключем, а читати — будь-хто.
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// Якщо лічильник мовчить довше, вважаємо, що свіжих даних немає
// (вимкнули комп'ютер, пропав інтернет чи зв'язок із камерою)
export const STALE_AFTER_MINUTES = 10;

// Як часто сайт перепитує базу
const REFRESH_MS = 60 * 1000;

/** Останнє, що надіслав лічильник: { people_count, updated_at } або null */
export async function getOccupancy(objectKey) {
  const { data, error } = await supabase
    .from('field_occupancy')
    .select('people_count, updated_at')
    .eq('object_key', objectKey)
    .maybeSingle();

  if (error) throw new Error('Не вдалося дізнатися, скільки людей на полі');
  return data;
}

/**
 * Хук для компонентів: скільки людей на полі, з автооновленням раз на хвилину.
 * Повертає { count, minutesAgo, fresh, loading }.
 * fresh === false — свіжих даних немає, число показувати не варто.
 */
export function useOccupancy(objectKey) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true; // щоб не чіпати компонент, якого вже немає на сторінці

    async function refresh() {
      try {
        const data = await getOccupancy(objectKey);
        if (alive) setRow(data);
      } catch {
        if (alive) setRow(null); // помилка — показуємо «дані недоступні»
      } finally {
        if (alive) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    }

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [objectKey]);

  const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : null;
  const minutesAgo =
    updatedAt === null ? null : Math.max(0, Math.floor((now - updatedAt) / 60000));
  const fresh =
    row?.people_count != null && minutesAgo !== null && minutesAgo < STALE_AFTER_MINUTES;

  return { count: row?.people_count ?? null, minutesAgo, fresh, loading };
}

/** 1 людина, 2 людини, 5 людей, 11 людей, 21 людина */
export function peopleWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (last === 1 && lastTwo !== 11) return 'людина';
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'людини';
  return 'людей';
}

/** 0 -> 'щойно', 3 -> '3 хв тому' */
export function agoText(minutes) {
  if (minutes === null) return '';
  if (minutes < 1) return 'щойно';
  return `${minutes} хв тому`;
}
