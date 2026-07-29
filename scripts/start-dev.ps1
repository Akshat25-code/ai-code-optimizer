# Start AI Code Optimizer (dev)
$root = Split-Path -Parent $PSScriptRoot
Write-Host "Starting backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; `$env:ENABLE_CODE_EXECUTION='1'; `$env:ALLOW_FAKE_AI='1'; python main.py"
Start-Sleep -Seconds 2
Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm run dev"
Write-Host "Open http://127.0.0.1:5173/workspace"
