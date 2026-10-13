@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Перший запуск: окреме середовище й потрібні програми (один раз, 5-15 хвилин)
if not exist ".venv\installed.ok" (
  echo Перший запуск: встановлюю потрібні програми, це займе 5-15 хвилин...
  python -m venv .venv || goto nopython
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto failed
  echo ok> ".venv\installed.ok"
)

".venv\Scripts\python.exe" counter.py %*
pause
exit /b

:nopython
echo Не знайдено Python. Встановіть його з python.org і позначте "Add python.exe to PATH".
pause
exit /b 1

:failed
echo Не вдалося встановити програми. Перевірте інтернет і запустіть ще раз.
pause
exit /b 1
