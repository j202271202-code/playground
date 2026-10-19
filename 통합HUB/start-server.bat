@echo off
setlocal
set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%PATH%"
cd /d "%~dp0"

echo 통합HUB를 로컬 서버로 엽니다...
echo (이 창을 닫으면 서버도 꺼집니다)
echo.

start "" http://localhost:8787/index.html
python -m http.server 8787 --bind 127.0.0.1
