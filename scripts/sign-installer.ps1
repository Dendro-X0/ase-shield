# Sign Anti-SE Companion NSIS installer with Authenticode.
# Requires: signtool.exe (Windows SDK) and certificate env vars.
#
# Usage:
#   $env:WINDOWS_CERTIFICATE = "C:\path\to\cert.pfx"
#   $env:WINDOWS_CERTIFICATE_PASSWORD = "secret"
#   .\scripts\sign-installer.ps1
#
# Or with base64 cert in env (CI):
#   $env:WINDOWS_CERTIFICATE = "<base64>"
#   $env:WINDOWS_CERTIFICATE_PASSWORD = "secret"

param(
  [string]$InstallerPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $InstallerPath) {
  $bundleDir = Join-Path $PSScriptRoot "..\apps\companion\src-tauri\target\release\bundle\nsis"
  $candidate = Get-ChildItem -Path $bundleDir -Filter "*.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $candidate) {
    throw "No NSIS installer found. Run: pnpm --filter @ase/companion tauri:build"
  }
  $InstallerPath = $candidate.FullName
}

if (-not (Test-Path $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}

$cert = $env:WINDOWS_CERTIFICATE
$password = $env:WINDOWS_CERTIFICATE_PASSWORD
if (-not $cert -or -not $password) {
  throw "Set WINDOWS_CERTIFICATE and WINDOWS_CERTIFICATE_PASSWORD environment variables."
}

$pfxPath = $cert
$tempPfx = $null
if ($cert.Length -gt 260 -and -not (Test-Path $cert)) {
  $tempPfx = Join-Path $env:TEMP "ase-signing-cert.pfx"
  [IO.File]::WriteAllBytes($tempPfx, [Convert]::FromBase64String($cert))
  $pfxPath = $tempPfx
}

$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if (-not $signtool) {
  throw "signtool.exe not found. Install Windows SDK or Visual Studio Build Tools."
}

Write-Host "Signing $InstallerPath"
& signtool.exe sign /fd SHA256 /f $pfxPath /p $password /tr http://timestamp.digicert.com /td SHA256 $InstallerPath
& signtool.exe verify /pa $InstallerPath

if ($tempPfx) {
  Remove-Item $tempPfx -Force
}

Write-Host "Signed successfully."
