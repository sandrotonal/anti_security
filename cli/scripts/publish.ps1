param(
    [ValidateSet("cargo", "npm", "all")]
    [string]$Target = "all"
)

$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$CLI_DIR = Join-Path $ROOT "cli"

Write-Host "╔════════════════════════════════════╗" -ForegroundColor White
Write-Host "║      securify publish script       ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

# Check version
$TOML_PATH = Join-Path $CLI_DIR "Cargo.toml"
$VERSION = Select-String -Path $TOML_PATH -Pattern '^version = "(.*)"' | ForEach-Object { $_.Matches.Groups[1].Value }
Write-Host "  version : $VERSION" -ForegroundColor Cyan

function Publish-Cargo {
    Write-Host "`n  ── publishing to crates.io ──" -ForegroundColor Yellow
    Set-Location $CLI_DIR
    cargo publish
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✔ published to crates.io" -ForegroundColor Green
    } else {
        Write-Host "  ✖ cargo publish failed" -ForegroundColor Red
    }
}

function Publish-Npm {
    Write-Host "`n  ── publishing to npm ──" -ForegroundColor Yellow
    Set-Location $CLI_DIR
    npm publish --access public
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✔ published to npm" -ForegroundColor Green
    } else {
        Write-Host "  ✖ npm publish failed" -ForegroundColor Red
    }
}

switch ($Target) {
    "cargo" { Publish-Cargo }
    "npm" { Publish-Npm }
    "all" {
        Publish-Cargo
        Publish-Npm
    }
}

Set-Location $ROOT
Write-Host "`n  done." -ForegroundColor Green
