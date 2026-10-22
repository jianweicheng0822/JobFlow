@echo off
setlocal
rem One-click local dev: makes sure Docker and MySQL are up, then starts the backend
rem and frontend in their own windows and opens the app once the backend answers.
cd /d "%~dp0"

rem --- 1. Docker ------------------------------------------------------------
docker info >nul 2>&1
if errorlevel 1 (
    echo Starting Docker Desktop...
    if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
        echo Docker Desktop not found. Install it or start Docker yourself, then run this again.
        goto :fail
    )
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
    call :wait_for "docker info" 90 "Docker"
    if errorlevel 1 goto :fail
)

rem --- 2. MySQL -------------------------------------------------------------
rem Reuse the existing container (and its data) if there is one; only create it if not
set "MYSQL_ID="
for /f %%i in ('docker compose ps -a -q mysql 2^>nul') do set "MYSQL_ID=%%i"
if defined MYSQL_ID (
    docker start %MYSQL_ID% >nul
) else (
    echo Creating the MySQL container...
    docker compose up -d mysql
    for /f %%i in ('docker compose ps -a -q mysql 2^>nul') do set "MYSQL_ID=%%i"
)
if not defined MYSQL_ID (
    echo Couldn't start MySQL. Check that .env has DB_PASSWORD set.
    goto :fail
)
rem mysqladmin ping succeeds once the server accepts connections, no login needed
call :wait_for "docker exec %MYSQL_ID% mysqladmin ping -h 127.0.0.1 --silent" 60 "MySQL"
if errorlevel 1 goto :fail

rem --- 3. Checks that would otherwise only show up as a crash in the backend window
rem The backend reads .env itself; these only need to be in one of the two places
call :check_setting DB_USERNAME "the backend won't be able to log in to MySQL"
call :check_setting JWT_SECRET "the backend won't start"
netstat -ano | findstr /r /c:":8080 .*LISTENING" >nul
if not errorlevel 1 (
    echo Port 8080 is already in use. Close the old backend window first.
    goto :fail
)

rem --- 4. Backend + frontend ------------------------------------------------
start "JobFlow Backend" cmd /k "cd /d %~dp0job-flow-backend && mvnw.cmd spring-boot:run"
start "JobFlow Frontend" cmd /k "cd /d %~dp0job-flow-frontend && npm run dev"

echo Waiting for the backend (first start can take a minute)...
call :wait_for "curl -sf -o nul http://localhost:8080/api/auth/providers" 120 "Backend"
if errorlevel 1 (
    echo Check the "JobFlow Backend" window for the error.
    goto :fail
)
start "" http://localhost:5173
echo JobFlow is running at http://localhost:5173

claude
exit /b 0

rem --- helpers ---------------------------------------------------------------
rem :wait_for "<command>" <seconds> "<name>" retries the command every 2s until it succeeds
:wait_for
set /a "_tries=%~2 / 2"
:wait_loop
%~1 >nul 2>&1
if not errorlevel 1 exit /b 0
set /a "_tries-=1"
if %_tries% leq 0 (
    echo %~3 didn't come up within %~2 seconds.
    exit /b 1
)
rem ping instead of timeout: timeout refuses to run without an interactive console
ping -n 3 127.0.0.1 >nul
goto :wait_loop

rem :check_setting NAME "why it matters" warns when NAME is neither set nor in .env
:check_setting
if defined %~1 exit /b 0
if exist .env findstr /b /r /c:"%~1=..*" .env >nul && exit /b 0
echo WARNING: %~1 isn't set in .env or the environment, %~2.
exit /b 0

:fail
pause
exit /b 1
