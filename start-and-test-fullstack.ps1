<# 
  start-and-test-fullstack.ps1
  Starts backend + frontend dev servers for EB-EMS and runs basic smoke tests.
  Usage:
    .\start-and-test-fullstack.ps1
    .\start-and-test-fullstack.ps1 -SkipInstall -NoBrowser
#>
param(
  [switch]$SkipInstall,
  [switch]$NoBrowser,
  [int]$BackendPort = 5000,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red }

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command '$name' not found in PATH."
  }
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $r }
    } catch {
      if ($_.Exception.Response) { return $_.Exception.Response }
    }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $Url"
}

function Test-Endpoint([string]$Name, [string]$Url, [int[]]$Allowed = @(200)) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
    $code = [int]$r.StatusCode
    if ($Allowed -contains $code) {
      Write-Ok "$Name -> $code $Url"
      return $true
    } else {
      Write-Fail "$Name -> $code (expected $($Allowed -join ',')) $Url"
      return $false
    }
  } catch {
    $code = $null
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    if ($code -and ($Allowed -contains $code)) {
      Write-Ok "$Name -> $code $Url"
      return $true
    }
    Write-Fail "$Name -> $($_.Exception.Message)"
    return $false
  }
}

Write-Step "Preflight"
Assert-Command node
Assert-Command npm
Write-Ok "node $(node -v)  npm $(npm -v)"
if (-not (Test-Path "backend\.env")) { throw "backend\.env not found. Copy backend\.env.example and configure DATABASE_URL/JWT_SECRET." }
Write-Ok "backend\.env present"
if (-not (Test-Path "backend\node_modules") -and -not $SkipInstall) {
  Write-Step "Installing backend dependencies"
  Push-Location backend; npm install; Pop-Location
}
if (-not (Test-Path "frontend\node_modules") -and -not $SkipInstall) {
  Write-Step "Installing frontend dependencies"
  Push-Location frontend; npm install; Pop-Location
}

Write-Step "Prisma client generate"
Push-Location backend
npx prisma generate | Out-Host
Pop-Location

Write-Step "Starting backend (http://localhost:$BackendPort)"
$backendOut = Join-Path $Root "_backend.dev.log"
$backendErr = Join-Path $Root "_backend.dev.err.log"
$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev > `"$backendOut`" 2> `"$backendErr`"" -WorkingDirectory (Join-Path $Root "backend") -PassThru -WindowStyle Minimized
Write-Ok "Backend PID $($backend.Id) (logs: $backendOut, $backendErr)"

Write-Step "Starting frontend (http://localhost:$FrontendPort)"
$frontendOut = Join-Path $Root "_frontend.dev.log"
$frontendErr = Join-Path $Root "_frontend.dev.err.log"
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev -- --port $FrontendPort > `"$frontendOut`" 2> `"$frontendErr`"" -WorkingDirectory (Join-Path $Root "frontend") -PassThru -WindowStyle Minimized
Write-Ok "Frontend PID $($frontend.Id) (logs: $frontendOut, $frontendErr)"

Write-Step "Waiting for services"
try { Wait-HttpOk "http://localhost:$BackendPort/api/health" 120 | Out-Null; Write-Ok "Backend responding" } catch { Write-Warn "Backend not ready yet: $($_.Exception.Message)" }
try { Wait-HttpOk "http://localhost:$FrontendPort/" 120 | Out-Null; Write-Ok "Frontend responding" } catch { Write-Warn "Frontend not ready yet: $($_.Exception.Message)" }

Write-Step "Smoke tests"
$allOk = $true
$allOk = (Test-Endpoint "Health" "http://localhost:$BackendPort/api/health" @(200)) -and $allOk
$allOk = (Test-Endpoint "Ready (DB)" "http://localhost:$BackendPort/api/ready" @(200)) -and $allOk
$allOk = (Test-Endpoint "Auth CSRF" "http://localhost:$BackendPort/api/auth/csrf" @(200)) -and $allOk
$allOk = (Test-Endpoint "Auth login-config" "http://localhost:$BackendPort/api/auth/login-config" @(200)) -and $allOk
$allOk = (Test-Endpoint "Frontend root" "http://localhost:$FrontendPort/" @(200)) -and $allOk

Write-Step "Summary"
Write-Host "  Backend:  http://localhost:$BackendPort  (PID $($backend.Id))"
Write-Host "  Frontend: http://localhost:$FrontendPort (PID $($frontend.Id))"
Write-Host "  Health:   http://localhost:$BackendPort/api/health"
Write-Host "  Ready:    http://localhost:$BackendPort/api/ready"
if ($allOk) { Write-Ok "Smoke tests passed." } else { Write-Warn "Some smoke tests failed. Check logs: $backendOut, $backendErr, $frontendOut, $frontendErr" }
Write-Host "`nTo stop:" -ForegroundColor Cyan
Write-Host "  Stop-Process -Id $($backend.Id),$($frontend.Id) -Force"
if (-not $NoBrowser) {
  try { Start-Process "http://localhost:$FrontendPort/" | Out-Null } catch {}
}

# Save PIDs for convenience
@{ backendPid = $backend.Id; frontendPid = $frontend.Id; startedAt = (Get-Date).ToString("o") } |
  ConvertTo-Json | Set-Content (Join-Path $Root "_dev_processes.json")
Write-Ok "Wrote _dev_processes.json"
