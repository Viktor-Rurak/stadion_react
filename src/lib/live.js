// Трансляція з камери майданчика.
//
// Як це влаштовано: сервер цілодобово забирає потік із реєстратора
// й віддає його в YouTube (папка camera-stream). Сайт лише показує плеєр,
// тож глядачі вантажать відео з YouTube — ні наш сервер, ні інтернет
// стадіону від їхньої кількості не залежать.
//
// У базі лежить тільки те, який ролик показувати. Читати це може будь-хто,
// а змінювати — лише адміни (це стереже RLS у самій базі).
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/** Налаштування трансляції майданчика або null, якщо рядка немає */
export async function getStream(objectKey) {
  const { data, error } = await supabase
    .from('live_streams')
    .select('object_key, youtube_channel_id, youtube_video_id, enabled')
    .eq('object_key', objectKey)
    .maybeSingle();

  if (error) throw new Error('Не вдалося завантажити налаштування трансляції');
  return data;
}

/** Зберегти налаштування (вийде лише в адміна) */
export async function saveStream(objectKey, { channelId, videoId, enabled }) {
  const row = {
    object_key: objectKey,
    youtube_channel_id: clean(channelId),
    youtube_video_id: clean(videoId),
    enabled: Boolean(enabled),
    updated_at: new Date().toISOString(),
  };

  if (row.enabled && !row.youtube_channel_id && !row.youtube_video_id) {
    throw new Error('Щоб увімкнути трансляцію, вкажіть канал або ролик YouTube.');
  }

  const { data, error } = await supabase
    .from('live_streams')
    .upsert(row, { onConflict: 'object_key' })
    .select();

  if (error) throw new Error(translateStreamError(error));
  if (!data || data.length === 0) {
    throw new Error('Не вдалося зберегти: налаштовувати трансляцію можуть лише адміністратори.');
  }
  return data[0];
}

/**
 * Адреса плеєра для <iframe> або null, якщо показувати нічого.
 * Якщо вказано ролик — показуємо його; інакше те, що зараз в етері на каналі.
 */
export function embedUrl(stream) {
  if (!stream?.enabled) return null;

  if (stream.youtube_video_id) {
    return `https://www.youtube-nocookie.com/embed/${stream.youtube_video_id}?rel=0`;
  }
  if (stream.youtube_channel_id) {
    // Плеєр каналу сам показує те, що в етері просто зараз, — адресу
    // не доводиться міняти після кожного перезапуску трансляції.
    // Цей різновид плеєра працює лише на youtube.com, без «nocookie».
    return `https://www.youtube.com/embed/live_stream?channel=${stream.youtube_channel_id}`;
  }
  return null;
}

/** Хук для компонентів: { stream, loading } */
export function useStream(objectKey) {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    getStream(objectKey)
      .then((data) => alive && setStream(data))
      .catch(() => alive && setStream(null))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [objectKey]);

  return { stream, loading };
}

// --- Дрібниці --------------------------------------------------------------

/**
 * З того, що вставив адмін, дістаємо потрібний шматок.
 * Приймаємо і просто id, і повне посилання:
 *   https://www.youtube.com/watch?v=abc12345678  -> abc12345678
 *   https://youtu.be/abc12345678                 -> abc12345678
 *   https://www.youtube.com/channel/UCxxxx…      -> UCxxxx…
 */
function clean(value) {
  const text = (value ?? '').trim();
  if (!text) return null;

  const channel = text.match(/UC[A-Za-z0-9_-]{22}/);
  if (channel) return channel[0];

  const watch = text.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];

  const short = text.match(/(?:youtu\.be\/|live\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (short) return short[1];

  return text;
}

function translateStreamError(error) {
  const text = `${error.code ?? ''} ${error.message ?? ''}`;

  if (text.includes('42501') || text.includes('row-level security')) {
    return 'Налаштовувати трансляцію можуть лише адміністратори.';
  }
  if (text.includes('youtube_channel_id')) {
    return 'Це не схоже на адресу каналу YouTube — ідентифікатор каналу починається з «UC».';
  }
  if (text.includes('youtube_video_id')) {
    return 'Це не схоже на посилання на трансляцію YouTube.';
  }
  if (text.includes('live_streams_has_source')) {
    return 'Щоб увімкнути трансляцію, вкажіть канал або ролик YouTube.';
  }
  return 'Не вдалося зберегти налаштування. Спробуйте ще раз.';
}
