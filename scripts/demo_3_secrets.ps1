# Demo 3: secret scanning + redaction (uses a fake key — safe to run).
# Run:  .\scripts\demo_3_secrets.ps1
$code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwx"' + "`n" + 'print("deploying")' + "`n"
$body = @{ code = $code; filename = "deploy.py" } | ConvertTo-Json
Write-Output "--- scan ---"
Invoke-RestMethod -Uri "http://localhost:8001/intelligence/scan-secrets" `
  -Method Post -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 6
Write-Output "--- redact ---"
Invoke-RestMethod -Uri "http://localhost:8001/intelligence/redact-secrets" `
  -Method Post -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 4
