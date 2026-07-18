@echo off

start "JobFlow Backend" cmd /k "cd /d %~dp0job-flow-backend && mvnw.cmd spring-boot:run"
start "JobFlow Frontend" cmd /k "cd /d %~dp0job-flow-frontend && npm run dev"
