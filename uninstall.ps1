$ErrorActionPreference = 'Stop'
try {
    if (Get-Process Illustrator -ErrorAction SilentlyContinue) { throw 'Close all Illustrator instances first.' }
    $dest = Join-Path $env:APPDATA 'Adobe\CEP\extensions\new-illustrator-extension'
    $backupRoot = Join-Path $env:APPDATA 'Pardach\StudioSetCatalog\backups'
    if (Test-Path -LiteralPath $dest) {
        New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
        $backup = Join-Path $backupRoot ('uninstalled-' + [Guid]::NewGuid().ToString('N'))
        Move-Item -LiteralPath $dest -Destination $backup
        Write-Host "Removed from CEP. Backup: $backup"
    } else { Write-Host 'Extension not installed.' }
    Write-Host 'Shared Adobe CEP registry settings were not changed.'
    exit 0
} catch { Write-Error -ErrorAction Continue $_; exit 1 }
