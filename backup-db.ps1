# Database Backup Script (EBPE RFQ Section 5.9)
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Ethiobiopharma-Backups\Database"
$backupFile = "$backupDir\ebpe_db_$date.sql"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Run pg_dump using the .env credentials
$env:DATABASE_URL = (Get-Content "C:\Ethiobiopharma-FullStack\backend\.env" | Select-String "DATABASE_URL").ToString().Split('=')[1].Trim('"')

Write-Host "Starting database backup to $backupFile..."
pg_dump -d $env:DATABASE_URL -f $backupFile -F c

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup successful!" -ForegroundColor Green
    # Compress to save space
    Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
    Remove-Item $backupFile
    Write-Host "✅ Compressed to $backupFile.zip" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed." -ForegroundColor Red
}
