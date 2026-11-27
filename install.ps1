param([switch]$EnableUnsigned)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$cep = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$dest = Join-Path $cep 'new-illustrator-extension'
$backupRoot = Join-Path $env:APPDATA 'Pardach\StudioSetCatalog\backups'
$stamp = [Guid]::NewGuid().ToString('N')
$stage = Join-Path $backupRoot ("stage-" + $stamp)
$backup = Join-Path $backupRoot ("previous-" + $stamp)
$oldMoved = $false
$installed = $false
try {
    if (Get-Process Illustrator -ErrorAction SilentlyContinue) { throw 'Close all Illustrator instances first.' }
    New-Item -ItemType Directory -Force -Path $cep,$backupRoot,$stage | Out-Null
    foreach ($entry in @('CSXS','client','host','icons','VERSION.json')) {
        Copy-Item -LiteralPath (Join-Path $root $entry) -Destination $stage -Recurse -Force
    }
    foreach ($entry in @('CSXS\manifest.xml','client\index.html','client\sql-wasm.js','client\sql-wasm.wasm','host\script.jsx','host\addSymbol.jsx','icons\normal.png')) {
        if (-not (Test-Path -LiteralPath (Join-Path $stage $entry) -PathType Leaf)) { throw "Missing payload: $entry" }
    }
    [xml]$manifest = Get-Content -LiteralPath (Join-Path $stage 'CSXS\manifest.xml') -Raw -Encoding UTF8
    if ($manifest.ExtensionManifest.ExtensionBundleId -ne 'com.yourcompany.newextension') { throw 'Unexpected extension ID.' }
    if (Test-Path -LiteralPath $dest) {
        # Retain old CEP profile if it was created in the extension directory.
        $profile = Join-Path $dest 'cef-user-data'
        if (Test-Path -LiteralPath $profile) { Copy-Item -LiteralPath $profile -Destination $stage -Recurse -Force }
        Move-Item -LiteralPath $dest -Destination $backup
        $oldMoved = $true
    }
    Move-Item -LiteralPath $stage -Destination $dest
    $installed = $true
    if ($EnableUnsigned) {
        # Explicit opt-in for unsigned development builds only. Shared CEP settings
        # are not removed on uninstall.
        foreach ($major in 9,10,11,12) {
            $key = "HKCU:\Software\Adobe\CSXS.$major"
            New-Item -Path $key -Force | Out-Null
            New-ItemProperty -Path $key -Name PlayerDebugMode -PropertyType String -Value '1' -Force | Out-Null
        }
    }
    Write-Host "Installed: $dest"
    if ($oldMoved) { Write-Host "Previous version backup: $backup" }
    if (-not $EnableUnsigned) { Write-Host 'Unsigned source builds may require explicit developer-mode opt-in.' }
    Write-Host 'Open Illustrator > Window > Extensions.'
    exit 0
} catch {
    Write-Error -ErrorAction Continue $_
    if ($installed -and (Test-Path -LiteralPath $dest)) {
        Move-Item -LiteralPath $dest -Destination (Join-Path $backupRoot ("failed-" + $stamp))
    }
    if ($oldMoved -and -not (Test-Path -LiteralPath $dest)) {
        Move-Item -LiteralPath $backup -Destination $dest
    }
    Write-Host "Installation failed. Check backup/staging at $backupRoot"
    exit 1
}
