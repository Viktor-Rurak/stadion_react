"""
Лічильник людей на полі для сайту «Стадіон».

Що робить:
  раз на хвилину бере знімок із камери, рахує на ньому людей нейромережею
  YOLO і надсилає на сайт ЛИШЕ число. Самі знімки нікуди не передаються
  й не зберігаються — обробляються в пам'яті й одразу забуваються.

Запуск:
  python counter.py                     — працювати постійно
  python counter.py --once              — один підрахунок, щоб перевірити налаштування
  python counter.py --once --debug      — ще й зберегти debug.jpg із рамками довкола
                                          знайдених людей (лише на цьому комп'ютері)
  python counter.py --image фото.jpg --once --no-send
                                        — порахувати людей на готовому фото, нічого не надсилаючи

Налаштування — у файлі config.env поруч (зразок — config.example.env).
"""
import argparse
import os
import sys
import time
from datetime import datetime
from urllib.parse import quote

# Відеопотік із камери беремо через TCP — так надійніше на слабкому інтернеті.
# Змінну треба задати ДО підключення OpenCV.
os.environ.setdefault('OPENCV_FFMPEG_CAPTURE_OPTIONS', 'rtsp_transport;tcp')

import cv2
import numpy as np
import requests
from requests.auth import HTTPDigestAuth

HERE = os.path.dirname(os.path.abspath(__file__))


def log(message):
    print(f'[{datetime.now():%Y-%m-%d %H:%M:%S}] {message}', flush=True)


# ------------------------------------------------------------------ налаштування

def load_config(path):
    """Читає config.env: рядки НАЗВА=значення; порожні й ті, що з #, пропускаємо."""
    if not os.path.exists(path):
        sys.exit(f'Не знайдено {path}. Скопіюйте config.example.env у config.env і заповніть його.')

    config = {}
    with open(path, encoding='utf-8') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    return config


def parse_zone(text):
    """
    Межі поля на кадрі: 'x1,y1; x2,y2; ...' у частках від 0 до 1
    (0,0 — лівий верхній кут кадру, 1,1 — правий нижній).
    Порожньо — рахувати людей у всьому кадрі.
    """
    if not text.strip():
        return None

    points = []
    for pair in text.split(';'):
        x, y = pair.split(',')
        points.append((float(x), float(y)))

    if len(points) < 3:
        sys.exit('FIELD_ZONE: для меж поля потрібно щонайменше 3 точки')
    return points


# ------------------------------------------------------------------ камера

def grab_snapshot(cfg):
    """Знімок із камери у вигляді картинки OpenCV."""
    host = cfg['CAMERA_HOST']
    user = cfg['CAMERA_USER']
    password = cfg['CAMERA_PASSWORD']
    stream = f"{int(cfg.get('CAMERA_CHANNEL', '1'))}01"  # камера 15 -> 1501 (основний потік)

    # 1) Знімок через HTTP — для реєстратора це найлегше
    http_port = cfg.get('CAMERA_HTTP_PORT', '80')
    auth = HTTPDigestAuth(user, password)
    for path in (f'/ISAPI/Streaming/channels/{stream}/picture',
                 f'/ISAPI/ContentMgmt/StreamingProxy/channels/{stream}/picture'):
        try:
            # 5 с на з'єднання, 10 с на відповідь — щоб не чекати вічно, якщо камера мовчить
            response = requests.get(f'http://{host}:{http_port}{path}', auth=auth, timeout=(5, 10))
        except requests.RequestException:
            continue

        if response.status_code == 401:
            raise RuntimeError('Камера не прийняла логін або пароль (перевірте CAMERA_USER і CAMERA_PASSWORD)')

        if response.status_code == 200 and response.headers.get('Content-Type', '').startswith('image'):
            frame = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
            if frame is not None:
                return frame

    # 2) Запасний варіант — один кадр із відеопотоку RTSP
    rtsp_port = cfg.get('CAMERA_RTSP_PORT', '554')
    url = (f'rtsp://{quote(user, safe="")}:{quote(password, safe="")}'
           f'@{host}:{rtsp_port}/Streaming/Channels/{stream}')
    # Обмежуємо очікування: без цього недоступна камера «вішає» програму на хвилини
    capture = cv2.VideoCapture(url, cv2.CAP_FFMPEG, [
        cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000,
        cv2.CAP_PROP_READ_TIMEOUT_MSEC, 8000,
    ])
    ok, frame = capture.read()
    capture.release()
    if ok and frame is not None:
        return frame

    raise RuntimeError(
        f'Не вдалося отримати знімок із камери {host}. Перевірте адресу й номер камери '
        "та що цей комп'ютер у тій самій мережі, що й реєстратор.")


def read_image(path):
    """Відкриває фото з диска (працює й коли в шляху є кирилиця)."""
    frame = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise RuntimeError(f'Не вдалося відкрити фото {path}')
    return frame


# ------------------------------------------------------------------ підрахунок

def inside(point, polygon):
    """Чи лежить точка всередині многокутника (класичний метод променя)."""
    x, y = point
    result = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            result = not result
        j = i
    return result


def find_people(model, frame, zone, min_confidence):
    """Рамки людей на кадрі. Якщо задано межі поля — лише тих, хто стоїть усередині."""
    height, width = frame.shape[:2]
    result = model(frame, classes=[0], conf=min_confidence, verbose=False)[0]  # клас 0 — людина

    people = []
    for x1, y1, x2, y2 in result.boxes.xyxy.tolist():
        # Де людина стоїть — точка посередині нижнього краю рамки (ноги)
        feet = ((x1 + x2) / 2 / width, y2 / height)
        if zone is None or inside(feet, zone):
            people.append((int(x1), int(y1), int(x2), int(y2)))
    return people


def save_debug(frame, people, zone, path):
    """Зберігає кадр із рамками та межами поля — щоб налаштувати FIELD_ZONE."""
    image = frame.copy()
    height, width = image.shape[:2]

    if zone:
        points = np.array([(int(x * width), int(y * height)) for x, y in zone], np.int32)
        cv2.polylines(image, [points], True, (0, 200, 255), 2)
    for x1, y1, x2, y2 in people:
        cv2.rectangle(image, (x1, y1), (x2, y2), (60, 220, 60), 2)
    cv2.putText(image, f'people: {len(people)}', (20, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 1.3, (60, 220, 60), 3)

    ok, encoded = cv2.imencode('.jpg', image)
    if ok:
        encoded.tofile(path)  # так працює й коли в шляху є кирилиця


# ------------------------------------------------------------------ сайт

def send_count(cfg, count):
    """Передає число на сайт. Ключ пристрою дозволяє лише це — і нічого більше."""
    url = cfg['SUPABASE_URL'].rstrip('/') + '/rest/v1/rpc/report_occupancy'
    response = requests.post(
        url,
        json={'p_token': cfg['DEVICE_TOKEN'], 'p_count': count},
        headers={'apikey': cfg['SUPABASE_KEY']},
        timeout=15,
    )
    if response.status_code >= 300:
        raise RuntimeError(f'Сайт відповів помилкою {response.status_code}: {response.text[:200]}')


# ------------------------------------------------------------------ головний цикл

def main():
    parser = argparse.ArgumentParser(description='Лічильник людей на полі для сайту «Стадіон»')
    parser.add_argument('--config', default=os.path.join(HERE, 'config.env'))
    parser.add_argument('--once', action='store_true', help='зробити один підрахунок і вийти')
    parser.add_argument('--image', help='рахувати на готовому фото замість камери')
    parser.add_argument('--no-send', action='store_true', help='не надсилати число на сайт')
    parser.add_argument('--debug', action='store_true', help='зберегти debug.jpg з рамками')
    args = parser.parse_args()

    cfg = load_config(args.config)
    zone = parse_zone(cfg.get('FIELD_ZONE', ''))
    interval = int(cfg.get('INTERVAL_SECONDS', '60'))
    min_confidence = float(cfg.get('MIN_CONFIDENCE', '0.35'))

    # Нейромережу підключаємо тут: вона вантажиться кілька секунд
    log('Завантажую нейромережу…')
    from ultralytics import YOLO

    os.chdir(HERE)  # файл моделі при першому запуску скачається в цю папку
    model = YOLO(cfg.get('MODEL', 'yolo11n.pt'))
    log('Готово.')

    while True:
        started = time.time()
        try:
            frame = read_image(args.image) if args.image else grab_snapshot(cfg)
            people = find_people(model, frame, zone, min_confidence)

            if args.debug:
                save_debug(frame, people, zone, os.path.join(HERE, 'debug.jpg'))

            if args.no_send:
                log(f'На полі: {len(people)} (на сайт не надсилаю)')
            else:
                send_count(cfg, len(people))
                log(f'На полі: {len(people)} — надіслано на сайт')

        # Не падаємо: камера чи інтернет можуть тимчасово зникнути — спробуємо ще раз
        except Exception as error:
            log(f'Помилка: {error}')
            if args.once:
                sys.exit(1)

        if args.once:
            break
        time.sleep(max(1, interval - (time.time() - started)))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log('Зупинено.')
