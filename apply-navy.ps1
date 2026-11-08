<#
  apply-navy.ps1  —  Apply navy color to BARS + TEXT-INPUT FOCUS only
  Backs up every touched file to _bak_colors\<timestamp>\ before editing.
  Reversible via rollback-navy.ps1 (auto-generated in the same backup folder).
#>

$ErrorActionPreference = "Stop"
$root      = "C:\Ethio-bioharma-main"
$fe        = Join-Path $root "frontend"
$themeCss  = Join-Path $fe "src\styles\theme.css"
$sharedJsx = Join-Path $fe "src\pages\SharedPlanPage.jsx"
$archiveJsx= Join-Path $fe "src\pages\ArchivePage.jsx"

$stamp     = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $root "_bak_colors\$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

function W-Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function W-Ok($t)      { Write-Host "  [OK] $t" -ForegroundColor Green }
function W-Warn($t)    { Write-Host "  [!!] $t" -ForegroundColor Yellow }
function W-Err($t)     { Write-Host "  [XX] $t" -ForegroundColor Red }

# ─── Pre-flight ────────────────────────────────────────────────────
W-Section "Pre-flight"
foreach ($f in @($themeCss, $sharedJsx, $archiveJsx)) {
    if (-not (Test-Path $f)) { W-Err "Missing: $f"; return }
}
W-Ok "All 3 target files present"

# ─── Backup ────────────────────────────────────────────────────────
W-Section "Backing up to $backupDir"
Copy-Item $themeCss   (Join-Path $backupDir "theme.css")         -Force
Copy-Item $sharedJsx  (Join-Path $backupDir "SharedPlanPage.jsx") -Force
Copy-Item $archiveJsx (Join-Path $backupDir "ArchivePage.jsx")    -Force
W-Ok "3 files backed up"

# ─── Edit 1: theme.css — append navy rules ────────────────────────
W-Section "Editing theme.css (append 12 lines at bottom)"
$themeAppend = @"

/* ============================================================
   NAVY BRAND — BARS + TEXT-INPUT FOCUS ONLY (Option 1)
   Added: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') by apply-navy.ps1
   Rollback: delete this block, or run rollback-navy.ps1.
   ============================================================ */

/* --- Bars: navy instead of green --- */
.progress-bar-brand { background: #0B2545 !important; }

/* --- Text inputs: navy focus ring instead of Bootstrap blue (#86b7fe) --- */
.form-control:focus,
.form-select:focus,
.form-check-input:focus,
textarea.form-control:focus {
  border-color: #0B2545;
  box-shadow: 0 0 0 0.2rem rgba(11, 37, 69, 0.25);
  outline: 0;
}
"@

$themeBefore = (Get-Content $themeCss -Raw)
Add-Content -Path $themeCss -Value $themeAppend -Encoding UTF8
W-Ok "theme.css: appended 12 lines"

# ─── Edit 2: SharedPlanPage.jsx — progress bar hex swap ───────────
W-Section "Editing SharedPlanPage.jsx (line 183: #16a34a -> #0B2545)"
$sharedBefore = (Get-Content $sharedJsx -Raw)
$sharedCount = ([regex]::Matches($sharedBefore, [regex]::Escape("background: '#16a34a'"))).Count
if ($sharedCount -eq 0) {
    W-Warn "Pattern background: '#16a34a' not found — skipping (file may already be navy)"
} else {
    (Get-Content $sharedJsx -Raw) -replace [regex]::Escape("background: '#16a34a'"), "background: '#0B2545'" `
      | Set-Content -Path $sharedJsx -Encoding UTF8 -NoNewline
    W-Ok "SharedPlanPage.jsx: replaced $sharedCount occurrence(s)"
}

# ─── Edit 3: ArchivePage.jsx — Active bar green gradient -> navy ──
W-Section "Editing ArchivePage.jsx (line 80: #2ecc71/#27ae60 -> #0B2545/#081a30)"
$archiveBefore = (Get-Content $archiveJsx -Raw)
$oldGrad = "#2ecc71 0%, #27ae60 100%"
$newGrad = "#0B2545 0%, #081a30 100%"
$archiveCount = ([regex]::Matches($archiveBefore, [regex]::Escape($oldGrad))).Count
if ($archiveCount -eq 0) {
    W-Warn "Gradient '$oldGrad' not found — skipping"
} else {
    (Get-Content $archiveJsx -Raw) -replace [regex]::Escape($oldGrad), $newGrad `
      | Set-Content -Path $archiveJsx -Encoding UTF8 -NoNewline
    W-Ok "ArchivePage.jsx: replaced $archiveCount occurrence(s)"
}

# ─── Auto-generate rollback script inside the backup folder ───────
W-Section "Writing rollback-navy.ps1 to backup folder"
$rollbackPath = Join-Path $backupDir "rollback-navy.ps1"
$rollbackContent = @"
`$ErrorActionPreference = 'Stop'
`$root      = 'C:\Ethio-bioharma-main'
`$fe        = Join-Path `$root 'frontend'
`$bak       = '$backupDir'

Copy-Item (Join-Path `$bak 'theme.css')         (Join-Path `$fe 'src\styles\theme.css') -Force
Copy-Item (Join-Path `$bak 'SharedPlanPage.jsx') (Join-Path `$fe 'src\pages\SharedPlanPage.jsx') -Force
Copy-Item (Join-Path `$bak 'ArchivePage.jsx')    (Join-Path `$fe 'src\pages\ArchivePage.jsx') -Force

Write-Host 'Reverted: theme.css, SharedPlanPage.jsx, ArchivePage.jsx' -ForegroundColor Green
Write-Host 'Re-run restart-dev.ps1 and hard-refresh browser to see original colors.' -ForegroundColor Yellow
"@
[System.IO.File]::WriteAllText($rollbackPath, $rollbackContent, [System.Text.Encoding]::UTF8)
W-Ok "Rollback script: $rollbackPath"

# ─── Diff summary ─────────────────────────────────────────────────
W-Section "Change Summary"
Write-Host "  File: frontend\src\styles\theme.css" -ForegroundColor White
Write-Host "    + Appended 12 lines (navy bars + navy input focus)" -ForegroundColor Gray
Write-Host "  File: frontend\src\pages\SharedPlanPage.jsx:L183" -ForegroundColor White
Write-Host "    - background: '#16a34a'  (green)" -ForegroundColor Red
Write-Host "    + background: '#0B2545'  (navy)"  -ForegroundColor Green
Write-Host "  File: frontend\src\pages\ArchivePage.jsx:L80" -ForegroundColor White
Write-Host "    - #2ecc71 0%, #27ae60 100%   (green gradient)" -ForegroundColor Red
Write-Host "    + #0B2545 0%, #081a30 100%   (navy gradient)"  -ForegroundColor Green

W-Section "Done"
Write-Host "`n  Next steps:" -ForegroundColor Cyan
Write-Host "   1. powershell -ExecutionPolicy Bypass -File `"$root\restart-dev.ps1`"" -ForegroundColor White
Write-Host "   2. In browser: Ctrl+Shift+R to hard-refresh" -ForegroundColor White
Write-Host "   3. Verify: Plans bars = navy, Archive 'Active' bar = navy, input focus ring = navy" -ForegroundColor White
Write-Host "`n  To undo everything:" -ForegroundColor Yellow
Write-Host "   powershell -ExecutionPolicy Bypass -File `"$rollbackPath`"" -ForegroundColor White
Write-Host ""