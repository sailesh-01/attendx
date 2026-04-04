@echo off
title AttendX Server
set PORT=4000
echo Starting AttendX Server on port 4000...

:: Launch Edge browser after a 2-second delay to ensure server is ready
start /B cmd /c "timeout /t 2 /nobreak >nul & start msedge http://localhost:4000/"

:: Start the Node.js server in the current window
node server.js

pause
