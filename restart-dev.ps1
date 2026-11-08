<#
  restart-dev.ps1 — Restart Ethio-bioharma backend + frontend
  Kills anything on ports 5000 / 5173, opens fresh dev windows, waits for both,
  opens the browser. Does NOT modify any project file.
#>

$ErrorActionPreference = "Stop"
$root     = "C:\Ethio-bioharma-main"
$backend  = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$apiPort  = 5000
$webPort  = 5173
$webUrl   = "http://localhost:$webPort"

function W-Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function W-Ok($t)      { Write-Host "  [OK] $t" -ForegroundColor Green }
function W-Warn($t)    { Write-Host "  [!!] $t" -ForegroundColor Yellow }
function W-Err($t)     { Write-Host "  [XX] $t" -ForegroundColor Red }

# ─── 0. Sanity ──────────────────────────────────────────────────────
W-Section "Pre-flight"
if (-not (Test-Path $backend))  { W-Err "Missing: $backend";  return }
if (-not (Test-Path $frontend)) { W-Err "Missing: $frontend"; return }
W-Ok "Project folders present"

# ─── 1. Kill whatever is on the two dev ports ──────────────────────
W-Section "Stopping old dev servers"
foreach ($port in @($apiPort, $webPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $procId = $conn.OwningProcess
            $proc   = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing PID $procId ($($proc.ProcessName)) on :$port" -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        W-Ok "Port $port was already free"
    }
}
Start-Sleep -Seconds 1

# ─── 2. Verify ports are actually free now ─────────────────────────
W-Section "Verifying ports are free"
$stillBusy = @()
foreach ($port in @($apiPort, $webPort)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        $stillBusy += $port
    }
}
if ($stillBusy.Count -gt 0) {
    W-Err "Ports still busy: $($stillBusy -join ', '). Close windows manually and retry."
    return
}
W-Ok "Both ports free"

# ─── 3. Relaunch backend in its own window ─────────────────────────
W-Section "Starting backend (npm run dev)"
$backendCmd = @"
`$host.UI.RawUI.WindowTitle = 'EBPE-BACKEND'
Set-Location '$backend'
Write-Host '--- BACKEND (npm run dev) ---' -ForegroundColor Cyan
npm run dev
Write-Host '`nBackend exited. Press any key to close.' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
Start-Process powershell -ArgumentList "-NoExit","-Command",$backendCmd | Out-Null
W-Ok "Backend window opened"

# ─── 4. Relaunch frontend in its own window ────────────────────────
W-Section "Starting frontend (vite)"
$frontendCmd = @"
`$host.UI.RawUI.WindowTitle = 'EBPE-FRONTEND'
Set-Location '$frontend'
Write-Host '--- FRONTEND (npm run dev) ---' -ForegroundColor Cyan
npm run dev
Write-Host '`nFrontend exited. Press any key to close.' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
Start-Process powershell -ArgumentList "-NoExit","-Command",$frontendCmd | Out-Null
W-Ok "Frontend window opened"

# ─── 5. Wait for both ports ────────────────────────────────────────
W-Section "Waiting for servers (max 90s each)"
function Wait-Port($port, $label, $timeoutSec = 90) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet) {
            W-Ok "$label on :$port"
            return $true
        }
        Start-Sleep -Milliseconds 800
    }
    W-Err "$label did NOT respond on :$port in ${timeoutSec}s"
    return $false
}
$apiOk = Wait-Port $apiPort "backend"
$webOk = Wait-Port $webPort "frontend"

# ─── 6. Small HTTP probe ───────────────────────────────────────────
if ($apiOk) {
    W-Section "API probe"
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$apiPort/api/hero-images" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        W-Ok "GET /api/hero-images -> $($r.StatusCode)"
    } catch {
        W-Warn "API probe failed: $($_.Exception.Message)  (not fatal)"
    }
}

# ─── 7. Open browser ───────────────────────────────────────────────
if ($webOk) {
    W-Section "Opening browser"
    Start-Process $webUrl
    W-Ok "Opened $webUrl"
} else {
    W-Warn "Frontend down - check EBPE-FRONTEND window."
}

# ─── 8. Summary ────────────────────────────────────────────────────
W-Section "Summary"
Write-Host "  Backend : http://localhost:$apiPort   $(if($apiOk){'[OK]'}else{'[DOWN]'})" -ForegroundColor $(if($apiOk){'Green'}else{'Red'})
Write-Host "  Frontend: $webUrl                    $(if($webOk){'[OK]'}else{'[DOWN]'})" -ForegroundColor $(if($webOk){'Green'}else{'Red'})
Write-Host "`n  Hard-refresh browser: Ctrl+Shift+R" -ForegroundColor Cyan
Write-Host "`n  To stop later:  Get-Process node | Stop-Process -Force`n" -ForegroundColor Gray