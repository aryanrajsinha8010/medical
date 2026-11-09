@echo off
:: Dedicated wrapper that checks and installs all requirements in one go without launching background windows
call "%~dp0setup_and_run.bat" --install-only %*
exit /b %ERRORLEVEL%

