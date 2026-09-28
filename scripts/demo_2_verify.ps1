# Demo 2: verified optimization — run original vs optimized, compare outputs.
# Needs ENABLE_CODE_EXECUTION=1 (dev) or loopback; Docker if APP_ENV=production.
# Run:  .\scripts\demo_2_verify.ps1
$body = @{
  original_code  = "print(sum(range(100)))"
  optimized_code = "print(4950)"
  language       = "python"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/run-code/compare" `
  -Method Post -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 6
