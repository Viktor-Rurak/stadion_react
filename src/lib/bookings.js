// Запис на універсальний корт.
//
// Правила стереже сама база даних (їх неможливо обійти з сайту):
//   - тривалість запису — не більше 2 годин;
//   - одна гра на день на користувача: і власний запис, і долучення
//     до чужої гри рахуються разом (о 00:00 за Києвом настає новий
//     день — і записуватись можна знову);
//   - час на корті не може перетинатися з чужим записом;
//   - записатися можна лише в години роботи: 06:00–24:00;
//   - лише на найближчі 7 днів і не на час, що вже минув;
//   - долучитися можна лише до ВІДКРИТОЇ гри, де ще є вільні місця.
// Тут ми лише надсилаємо запити й перекладаємо відповіді бази
// зрозумілою мовою.
import { supabase } from './supabase.js';

/**
 * Види спорту для випадаючого списку у формі запису.
 * `value` йде в базу, `label` показуємо користувачу,
 * `defaultPlayers` — скільки гравців ставиться автоматично.
 */
export const SPORTS = [
  { value: 'tennis', label: 'Теніс', defaultPlayers: 4 },
  { value: 'volleyball', label: 'Волейбол', defaultPlayers: 12 },
  { value: 'basketball', label: 'Баскетбол', defaultPlayers: 10 },
];

/** Назва виду спорту українською: sportLabel('tennis') -> 'Теніс' */
export function sportLabel(value) {
  return SPORTS.find((s) => s.value === value)?.label ?? value;
}

/** Сьогоднішня дата за київським часом у форматі 'РРРР-ММ-ДД' */
export function kyivToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
}

// Скорочені назви днів тижня; 0 = неділя, як у JavaScript
const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер',
                'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

/**
 * Найближчі дні для вибору дати: сьогодні + наступні.
 * Повертає [{ date: '2026-09-08', weekday: 'Пн', day: 8, month: 'вер', isToday: true }, ...]
 */
export function nextDays(count = 7) {
  const [year, month, day] = kyivToday().split('-').map(Number);
  const days = [];

  for (let i = 0; i < count; i++) {
    // Рахуємо в UTC, щоб перехід на літній час не зсунув дати
    const date = new Date(Date.UTC(year, month - 1, day + i));
    days.push({
      date: date.toISOString().slice(0, 10),
      weekday: WEEKDAYS[date.getUTCDay()],
      day: date.getUTCDate(),
      month: MONTHS[date.getUTCMonth()],
      isToday: i === 0,
    });
  }
  return days;
}

/** База віддає час як '10:00:00' — показуємо '10:00' */
export function formatTime(time) {
  return String(time).slice(0, 5);
}

/** Скільки може тривати гра (обмеження бази — не більше 2 годин) */
export const DURATIONS = [
  { hours: 1, label: '1 година' },
  { hours: 1.5, label: '1.5 години' },
  { hours: 2, label: '2 години' },
];

// --- Час роботи корту та сітка для вибору часу ---
export const OPEN_FROM = 6 * 60; // 06:00 у хвилинах від опівночі
export const OPEN_TILL = 24 * 60; // 24:00
export const SLOT_MINUTES = 30; // крок сітки часу

/** '10:30' або '10:30:00' -> 630 (хвилин від опівночі) */
export function timeToMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

/** 630 -> '10:30' */
export function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/** Скільки хвилин минуло від опівночі за київським часом */
export function kyivNowMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
}

/** Чи йде в момент `minute` якась із ігор `games` */
export function isBusyAt(minute, games) {
  return games.some(
    (g) => minute >= timeToMinutes(g.start_time) && minute < timeToMinutes(g.end_time)
  );
}

/**
 * Чи можна почати гру о `start` (хвилини) тривалістю `hours`:
 * гра вміщається до закриття, не перетинається з іншими іграми
 * й не починається в минулому. Для не сьогоднішніх днів nowMinutes = -1.
 */
export function canStartAt(start, hours, games, nowMinutes = -1) {
  const end = start + hours * 60;
  if (start < OPEN_FROM || end > OPEN_TILL) return false;
  for (let t = start; t < end; t += SLOT_MINUTES) {
    if (t < nowMinutes || isBusyAt(t, games)) return false;
  }
  return true;
}

/**
 * Пояснення людською мовою, чому гру не можна почати о `start`
 * (або null, якщо можна). Показуємо його, коли людина натискає
 * клітинку «замало часу».
 */
export function whyCannotStart(start, hours, games, nowMinutes = -1) {
  const end = start + hours * 60;
  const from = minutesToTime(start);
  for (let t = start; t < Math.min(end, OPEN_TILL); t += SLOT_MINUTES) {
    if (t < nowMinutes) return `${from} уже минуло — оберіть пізніший час.`;
    if (isBusyAt(t, games)) {
      return `З ${from} гра на ${hours} год не вміститься: о ${minutesToTime(t)} корт уже зайнятий. Оберіть коротшу гру або інший час.`;
    }
  }
  if (end > OPEN_TILL) {
    return `З ${from} гра на ${hours} год не вміститься: корт працює до 24:00. Оберіть коротшу гру або раніший час.`;
  }
  return null;
}

/**
 * Публічний розклад дня — видно всім, навіть незалогіненим.
 * Показує лише час, вид спорту й кількість вільних місць, без імен.
 * Приклад: getDaySlots(kyivToday())
 */
export async function getDaySlots(date) {
  const { data, error } = await supabase.rpc('get_day_slots', { p_date: date });
  if (error) throw new Error('Не вдалося завантажити розклад корту');
  return data;
}

/**
 * Повний розклад дня — лише для залогінених.
 * Для кожної гри повертає: вид спорту, відкрита вона чи ні, скільки
 * гравців уже є, скільки місць лишилось, ім'я організатора, а також
 * `is_mine` (це моя гра) та `i_joined` (я вже в ній).
 * Приклад: getDaySchedule(kyivToday())
 */
export async function getDaySchedule(date) {
  const { data, error } = await supabase.rpc('get_day_schedule', { p_date: date });
  if (error) throw new Error('Не вдалося завантажити розклад корту');
  return data;
}

/**
 * Створити запис на корт.
 *
 * isOpen: false — закрите бронювання, грає лише ваша компанія;
 *         true  — відкрите: будь-хто може долучитися й скласти пару.
 * maxPlayers можна не вказувати — база сама поставить звичайну
 * кількість для обраного виду спорту.
 *
 * Приклад:
 *   createBooking({
 *     date: kyivToday(), startTime: '10:00', endTime: '12:00',
 *     sport: 'tennis', isOpen: true, note: 'Шукаю суперника, аматор'
 *   })
 */
export async function createBooking({
  date,
  startTime,
  endTime,
  sport = 'tennis',
  isOpen = false,
  maxPlayers = null,
  note = '',
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Щоб записатися, спочатку увійдіть');

  const { data, error } = await supabase
    .from('court_bookings')
    .insert({
      user_id: userData.user.id,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      sport,
      is_open: isOpen,
      max_players: maxPlayers, // null = автоматично за видом спорту
      note,
    })
    .select()
    .single();

  if (error) throw new Error(translateBookingError(error));
  return data;
}

/**
 * Долучитися до чужої відкритої гри (знайти собі суперника).
 * Приклад: joinGame('...id гри...')
 */
export async function joinGame(bookingId) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Щоб долучитися, спочатку увійдіть');

  // booking_date не передаємо — базa підставить дату самої гри
  const { data, error } = await supabase
    .from('booking_participants')
    .insert({ booking_id: bookingId, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw new Error(translateBookingError(error));
  return data;
}

/** Вийти з чужої гри (організатор має скасувати гру, а не виходити) */
export async function leaveGame(bookingId) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Спочатку увійдіть');

  const { data, error } = await supabase
    .from('booking_participants')
    .delete()
    .eq('booking_id', bookingId)
    .eq('user_id', userData.user.id)
    .select('id');

  if (error) throw new Error(translateBookingError(error));
  if (!data || data.length === 0) {
    throw new Error('Не вдалося вийти з гри: ви вже не в ній. Оновіть сторінку.');
  }
}

/** Скасувати свою гру (чужу база видалити не дасть) */
export async function cancelBooking(bookingId) {
  // .select() повертає видалені рядки: так ми точно знаємо, що гру скасовано,
  // а не тихо нічого не сталося (наприклад, якщо сесія вже закінчилась)
  const { data, error } = await supabase
    .from('court_bookings')
    .delete()
    .eq('id', bookingId)
    .select('id');

  if (error) throw new Error('Не вдалося скасувати запис');
  if (!data || data.length === 0) {
    throw new Error('Не вдалося скасувати: гру вже скасовано або вона не ваша. Оновіть сторінку.');
  }
}

// Переклад помилок бази зрозумілою мовою.
// Коди Postgres: 23505 — порушення унікальності, 23P01 — перетин
// (exclude), 23514 — порушення перевірки (check), 42501 — заборонено RLS.
function translateBookingError(error) {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`;

  // Повідомлення, які база формулює сама (тригери) — показуємо як є
  if (text.includes('Ця гра закрита')) {
    return 'Ця гра закрита для інших гравців.';
  }
  if (text.includes('немає вільних місць')) {
    return 'У цій грі вже немає вільних місць.';
  }
  if (text.includes('Організатор не може вийти')) {
    return 'Ви організатор цієї гри — її можна лише скасувати.';
  }

  if (text.includes('one_game_per_day')) {
    return 'У вас уже є гра на цей день. Наступного дня (після 00:00) можна знову.';
  }
  if (text.includes('one_join_per_booking')) {
    return 'Ви вже долучилися до цієї гри.';
  }
  if (text.includes('one_booking_per_day') || text.includes('23505')) {
    return 'У вас уже є запис на цей день. Новий можна зробити наступного дня (після 00:00).';
  }
  if (text.includes('23P01') || text.includes('no_time_overlap')) {
    return 'Цей час уже зайнятий. Оберіть інший проміжок.';
  }
  if (text.includes('duration_max_2h')) {
    return 'Запис можливий щонайбільше на 2 години.';
  }
  if (text.includes('duration_positive')) {
    return 'Час завершення має бути пізніше за час початку.';
  }
  if (text.includes('within_open_hours')) {
    return 'Корт працює з 06:00 до 24:00.';
  }
  if (text.includes('max_players_sane')) {
    return 'Кількість гравців має бути від 2 до 30.';
  }
  if (text.includes('note_length')) {
    return 'Коментар задовгий — максимум 200 символів.';
  }
  // 42501 — відмова політики доступу: дата поза найближчими 7 днями
  // або час, що вже минув
  if (text.includes('42501')) {
    return 'Записатися можна лише на найближчі 7 днів і на час, який ще не минув.';
  }
  return 'Не вдалося виконати дію. Спробуйте ще раз.';
}
