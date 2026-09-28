# Demo 1: deterministic static analysis (no AI key needed).
# Run:  .\scripts\demo_1_inspect.ps1   (server must be up on :8001)
$body = @{
  code     = "def fib(n):`n    if n <= 1:`n        return n`n    return fib(n-1) + fib(n-2)`n"
  language = "python"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/inspect-code" `
  -Method Post -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 6
