# Start MongoDB (with license fix for v8.3)
$dataDir = "$env:TEMP\mongodata"
$mongod = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"

if (-not (Get-Process -Name "mongod" -ErrorAction SilentlyContinue)) {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  $env:MONGODB_LICENSE_MODEL = "test"
  Start-Process -FilePath $mongod -ArgumentList "--dbpath $dataDir --port 27017" -WindowStyle Hidden
  Write-Host "MongoDB starting..." -ForegroundColor Yellow
  Start-Sleep 5
}

# Start backend
if (-not (Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "index" })) {
  Start-Process -FilePath "node" -WorkingDirectory "$PSScriptRoot\Backend" -ArgumentList "index.js" -WindowStyle Hidden
  Write-Host "Backend starting on :4000..." -ForegroundColor Yellow
  Start-Sleep 4
}

# Start frontend
Start-Process -FilePath "node" -WorkingDirectory "$PSScriptRoot\frontend" -ArgumentList "node_modules\vite\bin\vite.js --host 0.0.0.0" -WindowStyle Hidden
Write-Host "Frontend starting on :5173..." -ForegroundColor Yellow
Start-Sleep 4

Write-Host ""
Write-Host "QuizApp ready!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Cyan
