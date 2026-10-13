// Інтерактивний план території.
//
// Як це працює:
// 1. Для кожного об'єкта є «маска» — стисла чорно-біла картинка його
//    силуету (209 x 118 точок), збережена як base64 у data/planMasks.js.
// 2. Коли курсор рухається над планом, переводимо його координати
//    в координати маски й дивимося, чи стоїть там одиничний біт.
// 3. Якщо так — зберігаємо ключ об'єкта в стані hoveredKey і виставляємо
//    атрибут data-hover на контейнері. Далі все робить CSS (styles/home.css):
//    темнить план, показує накладку та підпис потрібного об'єкта.
// 4. Клік по корту веде на сторінку запису, по головному полю — на новини,
//    по штучному полю — на його сторінку з лічильником людей.
// 5. На телефоні миші немає: об'єкт підсвічується, поки на нього тиснуть
//    пальцем. Коротке натискання — перехід, довге — лише подивитися.
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OBJECTS, HIT_TEST_ORDER } from '../../data/objects.js';
import { PLAN_MASKS } from '../../data/planMasks.js';

// Скільки мілісекунд тримати палець, щоб це було «довге натискання»
const LONG_PRESS_MS = 400;

// Роздільність масок (мусить збігатися з тим, як їх згенеровано)
const MASK_WIDTH = 209;
const MASK_HEIGHT = 118;

// Розпаковує одну маску з base64 у масив байтів
function decodeMask(base64) {
  const text = atob(base64); // base64 -> рядок байтів
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i);
  }
  return bytes;
}

// Перевіряє, чи точка (x, y) належить об'єкту за його маскою
function maskHasPoint(mask, x, y) {
  const bitIndex = y * MASK_WIDTH + x;
  // bitIndex >> 3 — номер байта; 128 >> (bitIndex & 7) — потрібний біт у ньому
  return (mask[bitIndex >> 3] & (128 >> (bitIndex & 7))) !== 0;
}

export default function PlanMap() {
  const navigate = useNavigate();
  // Ключ об'єкта під курсором: 'main' | 'train' | 'court' | null
  const [hoveredKey, setHoveredKey] = useState(null);
  // Для дотиків: чи тримають зараз палець на плані і чи це довге натискання
  const touchActive = useRef(false);
  const longPress = useRef(false);
  const longPressTimer = useRef(null);

  // Розпаковуємо всі маски один раз (useMemo кешує результат між рендерами)
  const masks = useMemo(() => {
    const result = {};
    for (const key of HIT_TEST_ORDER) {
      if (PLAN_MASKS[key]) result[key] = decodeMask(PLAN_MASKS[key]);
    }
    return result;
  }, []);

  // Визначає, над яким об'єктом зараз курсор (або null)
  function findObjectUnderCursor(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    // Координати курсора (пікселі) -> координати маски (точки)
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * MASK_WIDTH);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * MASK_HEIGHT);
    if (x < 0 || y < 0 || x >= MASK_WIDTH || y >= MASK_HEIGHT) return null;

    for (const key of HIT_TEST_ORDER) {
      if (masks[key] && maskHasPoint(masks[key], x, y)) return key;
    }
    return null;
  }

  function updateHover(event) {
    const key = findObjectUnderCursor(event);
    if (key !== hoveredKey) setHoveredKey(key);
  }

  // Миша: підсвічуємо все, над чим курсор.
  // Палець: лише поки він притиснутий до плану.
  function handlePointerMove(event) {
    if (event.pointerType === 'mouse' || touchActive.current) updateHover(event);
  }

  // Палець торкнувся плану — одразу підсвічуємо об'єкт під ним
  function handlePointerDown(event) {
    if (event.pointerType === 'mouse') return;
    touchActive.current = true;
    longPress.current = false;
    updateHover(event);
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPress.current = true;
    }, LONG_PRESS_MS);
  }

  // Палець відпустили або браузер почав прокручувати сторінку — гасимо підсвітку
  function handlePointerEnd(event) {
    if (event.pointerType === 'mouse') return;
    touchActive.current = false;
    clearTimeout(longPressTimer.current);
    setHoveredKey(null);
  }

  function handleClick(event) {
    // Після довгого натискання нікуди не переходимо — людина лише роздивлялась
    if (longPress.current) {
      longPress.current = false;
      return;
    }

    const key = findObjectUnderCursor(event);
    const object = OBJECTS.find((o) => o.key === key);
    if (!object) return;

    // Корт, на який можна записатися, веде на сторінку запису.
    // Решта майданчиків — до своєї картки з описом нижче на сторінці.
    if (object.bookable) navigate('/booking');
    else if (object.link) navigate(object.link);
    else if (object.hasCounter) navigate('/fields/' + object.key);
    else navigate({ hash: '#' + object.id });
  }

  return (
    <section className="plan-section">
      <div
        className="plan-map"
        data-hover={hoveredKey ?? undefined}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredKey(null)}
        onClick={handleClick}
        // Довге натискання не відкриває меню «Зберегти картинку»
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Базова картинка генплану */}
        <img className="plan-base" src="/images/plan-base.png" alt="Генплан комплексу" />

        {/* Шари-накладки: вирізаний PNG кожного об'єкта */}
        {OBJECTS.map((object) => (
          <img
            key={object.key}
            className={`plan-overlay overlay-${object.key}`}
            src={object.overlayImage}
            alt={object.name}
          />
        ))}

        {/* Підписи об'єктів: точка + картка з назвою */}
        {OBJECTS.map((object) => (
          <div
            key={object.key}
            className={`plan-label label-${object.key}`}
            style={object.labelPosition}
          >
            <span className="label-dot"></span>
            <span className="label-card">
              <span className="label-title">{object.name}</span>
              <span className="label-sub">{object.labelSubtitle}</span>
              {object.labelAction && (
                <span className="label-action">{object.labelAction}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
