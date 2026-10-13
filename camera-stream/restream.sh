#!/usr/bin/env bash
#
# Трансляція з камери стадіону в YouTube.
#
# Що робить: безперервно забирає відео з реєстратора (RTSP) і віддає його
# в YouTube (RTMP). Сайт показує звичайний плеєр YouTube, тож глядачі
# вантажать відео з YouTube, а не з камери: скільки б їх не було,
# інтернет стадіону віддає лише один потік.
#
# Запуск уручну (щоб перевірити):  ./restream.sh
# Постійна робота:                 systemctl start stadion-stream
#
# Налаштування — у файлі stream.env поруч (зразок — stream.example.env).
set -u

cd "$(dirname "$0")"

if [ ! -f stream.env ]; then
  echo "Немає stream.env. Скопіюйте stream.example.env у stream.env і заповніть його." >&2
  exit 1
fi

# shellcheck disable=SC1091
. ./stream.env

: "${CAMERA_HOST:?Заповніть CAMERA_HOST у stream.env}"
: "${CAMERA_USER:?Заповніть CAMERA_USER у stream.env}"
: "${CAMERA_PASSWORD:?Заповніть CAMERA_PASSWORD у stream.env}"
: "${YOUTUBE_KEY:?Заповніть YOUTUBE_KEY у stream.env}"

CAMERA_RTSP_PORT="${CAMERA_RTSP_PORT:-554}"
CAMERA_CHANNEL="${CAMERA_CHANNEL:-1}"
VIDEO_BITRATE="${VIDEO_BITRATE:-2500k}"

# камера 15 -> 1501 (основний потік), 1502 був би запасним, гіршої якості
RTSP="rtsp://${CAMERA_USER}:${CAMERA_PASSWORD}@${CAMERA_HOST}:${CAMERA_RTSP_PORT}/Streaming/Channels/${CAMERA_CHANNEL}01"
YOUTUBE="rtmp://a.rtmp.youtube.com/live2/${YOUTUBE_KEY}"

# У повідомленнях ніколи не показуємо пароль і ключ трансляції
say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# YouTube приймає лише H.264. Дивимось, чим знімає камера:
# якщо H.264 — передаємо відео як є (сервер майже не навантажений),
# якщо H.265 — доводиться перекодовувати (потрібен сильніший сервер).
say "Перевіряю, що віддає камера…"
CODEC=$(ffprobe -v error -rtsp_transport tcp -timeout 15000000 \
  -select_streams v:0 -show_entries stream=codec_name \
  -of default=noprint_wrappers=1:nokey=1 -i "$RTSP" 2>/dev/null | head -n 1)

if [ -z "$CODEC" ]; then
  say "Камера не відповідає. Перевірте адресу, порт, логін і пароль у stream.env."
  exit 1
fi

if [ "$CODEC" = "h264" ]; then
  say "Камера віддає H.264 — передаю відео без перекодування."
  VIDEO_ARGS=(-c:v copy)
else
  say "Камера віддає ${CODEC} — YouTube такого не приймає, перекодовую в H.264."
  VIDEO_ARGS=(-c:v libx264 -preset veryfast -tune zerolatency
              -b:v "$VIDEO_BITRATE" -maxrate "$VIDEO_BITRATE" -bufsize "$VIDEO_BITRATE"
              -g 50 -pix_fmt yuv420p)
fi

say "Починаю трансляцію в YouTube."

# -f lavfi anullsrc — німа звукова доріжка: без звуку YouTube не вважає
#   трансляцію справжньою і не виводить її в етер.
# Якщо зв'язок обірветься, ffmpeg завершиться, а systemd запустить його знову.
exec ffmpeg -nostdin -hide_banner -loglevel warning \
  -rtsp_transport tcp -timeout 15000000 -i "$RTSP" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  "${VIDEO_ARGS[@]}" \
  -c:a aac -b:a 128k \
  -map 0:v:0 -map 1:a:0 \
  -f flv "$YOUTUBE"
