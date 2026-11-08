<#
  rebrand-to-navy.ps1  —  Full rebrand: kill all green EXCEPT semantic status colors.
  Preserves: --brand-success, --brand-warning, --brand-danger, --brand-secondary, --brand-accent
  Backs up everything to _bak_colors\<timestamp>\ before touching.
#>

$ErrorActionPreference = "Stop"
$root = "C:\Ethio-bioharma-main"
$fe   = Join-Path $root "frontend"
$be   = Join-Path $root "backend"

$stamp     = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $root "_bak_colors\$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

function W-Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function W-Ok($t)      { Write-Host "  [OK] $t" -ForegroundColor Green }
function W-Warn($t)    { Write-Host "  [!!] $t" -ForegroundColor Yellow }
function W-Err($t)     { Write-Host "  [XX] $t" -ForegroundColor Red }

# ─── Files to touch ───────────────────────────────────────────────
$files = @(
    (Join-Path $fe "src\styles\theme.css"),
    (Join-Path $fe "src\components\PlanEditor.jsx"),
    (Join-Path $fe "src\components\PlanItemModal.jsx"),
    (Join-Path $fe "src\pages\PlansPage.jsx"),
    (Join-Path $fe "src\pages\SharedPlanPage.jsx")
)

W-Section "Pre-flight"
foreach ($f in $files) {
    if (-not (Test-Path $f)) { W-Err "Missing: $f"; return }
}
W-Ok "All $($files.Count) target files present"

# ─── Backup ───────────────────────────────────────────────────────
W-Section "Backing up to $backupDir"
foreach ($f in $files) {
    Copy-Item $f (Join-Path $backupDir (Split-Path $f -Leaf)) -Force
}
W-Ok "$($files.Count) files backed up"

# ─── Replacement map ──────────────────────────────────────────────
# Order matters: longer/more specific patterns first
$replacements = @(
    # theme.css CSS variables
    @{ from = '--brand-primary:\s*#1E5631';     to = '--brand-primary:   #0B2545' },
    @{ from = '--brand-dark:\s*#0F2E1A';        to = '--brand-dark:      #081a30' },

    # theme.css hardcoded rgba shadows (auth card, button hover, row hover)
    @{ from = 'rgba\(15,\s*46,\s*26,\s*0\.35\)';  to = 'rgba(8, 26, 48, 0.35)' },
    @{ from = 'rgba\(30,\s*86,\s*49,\s*0\.35\)';  to = 'rgba(11, 37, 69, 0.35)' },
    @{ from = 'rgba\(30,\s*86,\s*49,\s*0\.04\)';  to = 'rgba(11, 37, 69, 0.06)' },

    # theme.css hero overlay (two-tone gradient)
    @{ from = 'rgba\(30,\s*86,\s*49,\s*0\.4\)';   to = 'rgba(11, 37, 69, 0.5)' },
    @{ from = 'rgba\(15,\s*46,\s*26,\s*0\.85\)';  to = 'rgba(8, 26, 48, 0.85)' },

    # theme.css landing nav gradient
    @{ from = 'rgba\(15,46,26,0\.9\)';           to = 'rgba(8,26,48,0.9)' },

    # theme.css footer bg + muted text
    @{ from = '#0d1b12';                          to = '#0a1c38' },
    @{ from = '#a3b8a9';                          to = '#94a3b8' },

    # Hardcoded #0f766e (OBJECTIVE accents) in 4 JSX files
    @{ from = '#0f766e';                          to = '#0B2545' }
)

# ─── Apply replacements ──────────────────────────────────────────
W-Section "Applying replacements"
$totalChanges = 0
foreach ($f in $files) {
    $content = Get-Content $f -Raw
    $fileHits = 0
    $fileName = Split-Path $f -Leaf

    foreach ($r in $replacements) {
        $count = ([regex]::Matches($content, $r.from)).Count
        if ($count -gt 0) {
            $content = $content -replace $r.from, $r.to
            $fileHits += $count
            Write-Host "  $fileName : '$($r.from)' × $count" -ForegroundColor Gray
        }
    }

    if ($fileHits -gt 0) {
        # Write UTF-8 without BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($f, $content, $utf8NoBom)
        $totalChanges += $fileHits
        Write-Host "  ✔ $fileName — $fileHits replacement(s)" -ForegroundColor Green
    } else {
        W-Warn "$fileName — no matches (unchanged)"
    }
}

W-Ok "Total replacements: $totalChanges"

# ─── Append: kill green progress bars that use Bootstrap bg-success ─
W-Section "Appending progress-bar override"
$theme = Join-Path $fe "src\styles\theme.css"
$append = @"

/* ============================================================
   FULL REBRAND — kill remaining brand greens
   Added: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') by rebrand-to-navy.ps1
   Semantic greens (status badges, success alerts) preserved.
   ============================================================ */

/* Progress bars using Bootstrap's bg-success → navy */
.progress-bar.bg-success { background-color: #0B2545 !important; }

/* If any utility class renders a brand-green background, kill it */
.bg-success.progress-bar { background-color: #0B2545 !important; }
"@

Add-Content -Path $theme -Value $append -Encoding UTF8
W-Ok "theme.css appended"

# ─── Generate rollback script ─────────────────────────────────────
W-Section "Generating rollback script"
$rollbackPath = Join-Path $backupDir "rollback-rebrand.ps1"
$rollbackContent = @"
`$ErrorActionPreference = 'Stop'
`$root = 'C:\Ethio-bioharma-main'
`$fe   = Join-Path `$root 'frontend'
`$bak  = '$backupDir'

Copy-Item (Join-Path `$bak 'theme.css')          (Join-Path `$fe 'src\styles\theme.css') -Force
Copy-Item (Join-Path `$bak 'PlanEditor.jsx')     (Join-Path `$fe 'src\components\PlanEditor.jsx') -Force
Copy-Item (Join-Path `$bak 'PlanItemModal.jsx')  (Join-Path `$fe 'src\components\PlanItemModal.jsx') -Force
Copy-Item (Join-Path `$bak 'PlansPage.jsx')      (Join-Path `$fe 'src\pages\PlansPage.jsx') -Force
Copy-Item (Join-Path `$bak 'SharedPlanPage.jsx') (Join-Path `$fe 'src\pages\SharedPlanPage.jsx') -Force

Write-Host 'Reverted all 5 files to pre-rebrand state.' -ForegroundColor Green
Write-Host 'Re-run restart-dev.ps1 + hard refresh to see original greens.' -ForegroundColor Yellow
"@
[System.IO.File]::WriteAllText($rollbackPath, $rollbackContent, [System.Text.Encoding]::UTF8)
W-Ok "Rollback: $rollbackPath"

# ─── Summary ─────────────────────────────────────────────────────
W-Section "Rebrand complete"
Write-Host @"

WHAT CHANGED:
  --brand-primary       #1E5631 → #0B2545 (navy)
  --brand-dark          #0F2E1A → #081a30 (darker navy)
  Hero overlay greens   → navy tint
  Footer background     → #0a1c38 (deep navy)
  Footer muted text     → #94a3b8 (slate)
  Auth card shadows     → navy rgba
  Button hover shadows  → navy rgba
  Table row hover       → navy rgba
  OBJECTIVE accents     → navy (#0f766e → #0B2545 in 4 JSX files)
  Progress bars (bg-success) → navy

WHAT STAYED GREEN (intentional):
  --brand-success       #2ecc71  ← KPI traffic-light "good"
  --brand-warning       #f39c12  ← KPI traffic-light "warning"
  --brand-danger        #e74c3c  ← KPI traffic-light "critical"
  Status badges (badge bg-success) — Completed/Active/Approved
  Dashboard chart green series
  Gantt "Complete" status bars

NEXT STEPS:
  1. powershell -ExecutionPolicy Bypass -File `"C:\Ethio-bioharma-main\restart-dev.ps1`"
  2. In browser: Ctrl+Shift+R
  3. Verify: header navy, sidebar navy, hero navy, footer navy, buttons navy
             KPI traffic-light still green/amber/red (semantic)
             Status badges still green/blue (semantic)

ROLLBACK:
  powershell -ExecutionPolicy Bypass -File `"$rollbackPath`"

"@ -ForegroundColor White