# Demo 4: multi-stage review pipeline, local stages only (skip_ai=true).
# Exercises the repaired Static/Security/Performance stages + aggregation.
# Run:  .\scripts\demo_4_review.ps1
$body = @{
  code     = "import subprocess`ndef run(cmd):`n    subprocess.call(cmd, shell=True)`n`nwhile True:`n    print('loop')`n"
  language = "python"
  skip_ai  = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/review/pipeline" `
  -Method Post -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 8
