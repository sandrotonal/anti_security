Write-Host "╔════════════════════════════════════╗" -ForegroundColor White
Write-Host "║    securify - install rust tooling  ║" -ForegroundColor White
Write-Host "╚════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

# Check if Rust is already installed
try {
    $rustcVersion = rustc --version 2>$null
    if ($rustcVersion) {
        Write-Host "  ✔ Rust is already installed: $rustcVersion" -ForegroundColor Green
        exit 0
    }
} catch {}

Write-Host "  🔧 Installing Rust via rustup..." -ForegroundColor Yellow
Write-Host ""

# Download and run rustup-init
$rustupUrl = "https://win.rustup.rs/x86_64"
$installerPath = "$env:TEMP\rustup-init.exe"

try {
    Write-Host "  downloading rustup..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $rustupUrl -OutFile $installerPath -UseBasicParsing

    Write-Host "  installing rust (this may take a few minutes)..." -ForegroundColor Cyan
    $process = Start-Process -FilePath $installerPath -ArgumentList "-y", "--default-toolchain", "stable" -Wait -NoNewWindow -PassThru

    if ($process.ExitCode -eq 0) {
        # Add cargo to PATH for this session
        $env:Path += ";$env:USERPROFILE\.cargo\bin"
        Write-Host "  ✔ Rust installed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  restart your terminal or run:" -ForegroundColor Yellow
        Write-Host "    $env:USERPROFILE\.cargo\bin\cargo install securify" -ForegroundColor Cyan
    } else {
        Write-Host "  ✖ Installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
        Write-Host "  try manual installation: https://rustup.rs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✖ Error: $_" -ForegroundColor Red
    Write-Host "  try manual installation: https://rustup.rs" -ForegroundColor Yellow
} finally {
    if (Test-Path $installerPath) {
        Remove-Item $installerPath -Force
    }
}
