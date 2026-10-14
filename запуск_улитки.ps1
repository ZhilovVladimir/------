$ErrorActionPreference = "Stop"

$корень = $PSScriptRoot
$exe = Join-Path $корень "node_modules\electron\dist\electron.exe"

if (-not (Test-Path -LiteralPath $exe)) {
    throw "Не найден Electron. Выполни npm install и npx install-electron --no."
}

Start-Process `
    -FilePath $exe `
    -ArgumentList ('"' + $корень + '"') `
    -WorkingDirectory $корень