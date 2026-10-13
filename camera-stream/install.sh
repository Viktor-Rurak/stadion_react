#!/usr/bin/env bash
#
# Встановлення трансляції на сервері (Ubuntu / Debian).
# Запускати від root:  sudo ./install.sh
#
# Що робить:
#   1) ставить ffmpeg;
#   2) створює службу stadion-stream, яка працює цілодобово
#      й сама перезапускається, якщо зв'язок із камерою обірвався.
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" != "0" ]; then
  echo "Запустіть від root: sudo ./install.sh" >&2
  exit 1
fi

if [ ! -f "$HERE/stream.env" ]; then
  echo "Спочатку скопіюйте stream.example.env у stream.env і заповніть його." >&2
  exit 1
fi

echo "Ставлю ffmpeg…"
apt-get update -qq
apt-get install -y ffmpeg

# Пароль від камери й ключ трансляції має читати лише root
chmod 600 "$HERE/stream.env"
chmod +x "$HERE/restream.sh"

echo "Створюю службу stadion-stream…"
cat > /etc/systemd/system/stadion-stream.service <<SERVICE
[Unit]
Description=Трансляція з камери стадіону в YouTube
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$HERE/restream.sh
# Камера чи інтернет можуть тимчасово зникнути — пробуємо знову за 15 секунд
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now stadion-stream

echo
echo "Готово. Корисні команди:"
echo "  systemctl status stadion-stream    — чи працює"
echo "  journalctl -u stadion-stream -f    — що відбувається просто зараз"
echo "  systemctl restart stadion-stream   — перезапустити після зміни stream.env"
echo "  systemctl stop stadion-stream      — зупинити трансляцію"
