// Сторінка запису на корт.
//
// Порядок дій такий, як думає людина:
//   1) обрати день;
//   2) обрати тривалість і час на сітці;
//   3) обрати вид спорту та закриту чи відкриту гру;
//   4) натиснути «Записатися» — і лише ТУТ, якщо людина ще не увійшла,
//      просимо увійти. Усе обране при цьому не губиться.
//
// Тут же видно чужі відкриті ігри цього дня — до них можна долучитися
// замість того, щоб створювати свою.
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import {
  DURATIONS,
  nextDays,
  kyivNowMinutes,
  minutesToTime,
  sportLabel,
  canStartAt,
  whyCannotStart,
  getDaySchedule,
  getDaySlots,
  createBooking,
  joinGame,
  leaveGame,
  cancelBooking,
} from '../lib/bookings.js';
import DayPicker from '../components/booking/DayPicker.jsx';
import TimeGrid from '../components/booking/TimeGrid.jsx';
import GameOptions from '../components/booking/GameOptions.jsx';
import GameCard from '../components/booking/GameCard.jsx';
import BookingSummary from '../components/booking/BookingSummary.jsx';

const DAYS = nextDays(7);

export default function BookingPage() {
  const { openAuth } = useOutletContext(); // з Layout: відкрити вікно входу
  const { user } = useAuth();

  // --- Що обрала людина ---
  const [date, setDate] = useState(DAYS[0].date);
  const [hours, setHours] = useState(1);
  const [start, setStart] = useState(null); // хвилини від опівночі; null — ще не обрано
  const [sport, setSport] = useState('tennis');
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');

  // --- Дані з бази та стан сторінки ---
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // чекаємо відповідь на дію
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [askedToLogin, setAskedToLogin] = useState(false);

  const day = DAYS.find((d) => d.date === date);
  const dayLabel = `${day.isToday ? 'Сьогодні' : day.weekday}, ${day.day} ${day.month}`;
  // Для сьогоднішнього дня час, що вже минув, обрати не можна
  const nowMinutes = day.isToday ? kyivNowMinutes() : -1;

  // id змінюється лише при вході чи виході (а не при оновленні сесії раз на годину)
  const userId = user?.id ?? null;

  // Завантажити ігри обраного дня. Гостям база віддає менше даних (без імен).
  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      setGames(userId ? await getDaySchedule(date) : await getDaySlots(date));
    } catch (e) {
      setGames([]);
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, [date, userId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Хтось увійшов або вийшов — старі повідомлення («Ви записані…») вже не про нього
  useEffect(() => {
    setMessage(null);
  }, [userId]);

  // Обраний час міг стати недоступним: змінилась тривалість
  // або хтось інший щойно записався. Тоді просто знімаємо вибір.
  useEffect(() => {
    if (start !== null && !canStartAt(start, hours, games, nowMinutes)) {
      setStart(null);
    }
  }, [start, hours, games, nowMinutes]);

  // Моя гра цього дня: своя або чужа, до якої я долучився
  const myGame = games.find((g) => g.is_mine || g.i_joined);
  // Чужі відкриті ігри, де ще є місця
  const openGames = games.filter(
    (g) => g.is_open && g.free_slots > 0 && !g.is_mine && !g.i_joined
  );

  const startTime = start === null ? null : minutesToTime(start);
  const endTime = start === null ? null : minutesToTime(start + hours * 60);

  function chooseDay(newDate) {
    setDate(newDate);
    setStart(null);
    setMessage(null);
  }

  function chooseStart(minute) {
    setStart(minute);
    setMessage(null);
  }

  // Натиснули клітинку «замало часу» — пояснюємо, чому туди не можна
  function explainSlot(minute) {
    const reason = whyCannotStart(minute, hours, games, nowMinutes);
    if (reason) setMessage({ type: 'info', text: reason });
  }

  async function handleSubmit() {
    if (start === null) return;

    // Лише тут просимо увійти — усе обране залишиться на місці
    if (!user) {
      setAskedToLogin(true);
      openAuth('register');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await createBooking({
        date,
        startTime,
        endTime,
        sport,
        isOpen,
        note: isOpen ? note.trim() : '',
      });
      setMessage({ type: 'success', text: `Ви записані: ${dayLabel}, ${startTime}–${endTime}.` });
      setStart(null);
      setNote('');
      setAskedToLogin(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
      loadGames(); // оновлюємо розклад у будь-якому разі
    }
  }

  // Спільна обгортка для «Долучитися», «Вийти» та «Скасувати»
  async function runAction(action, successText) {
    if (!user) {
      openAuth('register');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ type: 'success', text: successText });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
      loadGames();
    }
  }

  // Після входу підказуємо: вибір збережено, лишилось натиснути кнопку
  const notice =
    message ??
    (askedToLogin && user && start !== null
      ? { type: 'info', text: 'Ви увійшли. Перевірте вибір і натисніть «Записатися».' }
      : null);

  return (
    <main className="booking-page">
      <div className="booking-head">
        <h1 className="page-title">Запис на корт</h1>
        <p className="page-subtitle">Універсальний корт · теніс, волейбол, баскетбол</p>
      </div>

      <div className="booking-layout">
        <div className="booking-main">
          <Step number={1} title="День">
            <DayPicker days={DAYS} value={date} onChange={chooseDay} />
          </Step>

          {myGame && (
            <Step title="Ваша гра цього дня">
              <GameCard
                game={myGame}
                highlight
                actionLabel={myGame.is_mine ? 'Скасувати' : 'Вийти'}
                confirmQuestion={myGame.is_mine ? 'Скасувати гру?' : 'Вийти з гри?'}
                confirmLabel={myGame.is_mine ? 'Так, скасувати' : 'Так, вийти'}
                disabled={busy}
                onAction={() =>
                  myGame.is_mine
                    ? runAction(() => cancelBooking(myGame.id), 'Гру скасовано — час знову вільний.')
                    : runAction(() => leaveGame(myGame.id), 'Ви вийшли з гри.')
                }
              />
              <p className="step-note">
                Одна гра на день. Щоб записатися на інший час, спершу скасуйте
                цю гру або вийдіть із неї.
              </p>
            </Step>
          )}

          {openGames.length > 0 && (
            <Step title="Шукають гравців">
              <div className="game-list">
                {openGames.map((game, index) => (
                  <GameCard
                    key={game.id ?? `${game.start_time}-${index}`}
                    game={game}
                    actionLabel="Долучитися"
                    actionKind="primary"
                    disabled={busy || Boolean(myGame)}
                    onAction={() => runAction(() => joinGame(game.id), 'Ви долучилися до гри.')}
                  />
                ))}
              </div>
            </Step>
          )}

          {/* Коли гра на цей день уже є, створювати нову немає сенсу */}
          {!myGame && (
            <>
              <Step number={2} title="Час">
                <div className="segmented" role="group" aria-label="Тривалість гри">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.hours}
                      type="button"
                      aria-pressed={hours === d.hours}
                      className={hours === d.hours ? 'segmented-option is-active' : 'segmented-option'}
                      onClick={() => setHours(d.hours)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <TimeGrid
                  games={games}
                  hours={hours}
                  start={start}
                  nowMinutes={nowMinutes}
                  loading={loading}
                  onPick={chooseStart}
                  onExplain={explainSlot}
                />
              </Step>

              <Step number={3} title="Гра">
                <GameOptions
                  sport={sport}
                  onSportChange={setSport}
                  isOpen={isOpen}
                  onOpenChange={setIsOpen}
                  note={note}
                  onNoteChange={setNote}
                />
              </Step>
            </>
          )}
        </div>

        <aside className="booking-aside">
          <BookingSummary
            dayLabel={dayLabel}
            startTime={startTime}
            endTime={endTime}
            sportText={sportLabel(sport)}
            isOpen={isOpen}
            blocked={Boolean(myGame)}
            isGuest={!user}
            busy={busy}
            notice={notice}
            onSubmit={handleSubmit}
          />
        </aside>
      </div>
    </main>
  );
}

// Одна картка-крок із номером і заголовком
function Step({ number, title, children }) {
  return (
    <section className="step">
      <h2 className="step-title">
        {number && <span className="step-number">{number}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}
