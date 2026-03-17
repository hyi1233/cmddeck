param(
  [string]$ReleaseDir = 'release'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $repoRoot $ReleaseDir

if (-not (Test-Path $releaseDir)) {
  throw "Release directory not found: $releaseDir"
}

$portableExe = Get-ChildItem -Path $releaseDir -Filter '*.exe' |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1

if (-not $portableExe) {
  throw "No portable executable found in $releaseDir"
}

$zipBaseName = ($portableExe.BaseName -replace '\s+', '-')
if ($zipBaseName -notmatch '-portable$') {
  $zipBaseName = "$zipBaseName-portable"
}

$zipPath = Join-Path $releaseDir ($zipBaseName + '.zip')

if (Test-Path $zipPath) {
  Remove-Item -Path $zipPath -Force
}

Compress-Archive -Path $portableExe.FullName -DestinationPath $zipPath -Force

Write-Host "Portable zip created:" $zipPath
