# SwasthyaBillCheck (NMBTP) - start all three local services (PowerShell)
# Usage: .\start.ps1      (run setup_and_run.bat or install_requirements.bat first on a fresh machine)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$Root\data\swasthyabillcheck.db")) {
    Write-Host "Database not found. Run 'npm run seed' or install_requirements.bat first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting AI engine on http://127.0.0.1:8000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\services\ai-engine'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Sleep -Seconds 2

Write-Host "Starting Fastify API on http://127.0.0.1:4000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\services\api'; npx tsx src/server.ts"
Start-Sleep -Seconds 2

Write-Host "Starting web app on http://127.0.0.1:5173 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\apps\web'; npx vite --host 127.0.0.1 --port 5173"
Start-Sleep -Seconds 3

Start-Process "http://localhost:5173"
Write-Host "All services launched. Close the three PowerShell windows to stop them."

