# Securify

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-black?style=flat-round" alt="License" />
  <img src="https://img.shields.io/badge/version-0.1.0-black?style=flat-round" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Vite%20%7C%20React%20%7C%20Tailwind-blue?style=flat-round" alt="Platform" />
  <img src="https://img.shields.io/badge/CLI-Rust-orange?style=flat-round" alt="CLI" />
</p>

**Securify** is a client-side credential leak detection suite. It scans codebases for API keys, database credentials, and cloud tokens before they reach production — all running locally on your machine.

## Web Application

The interactive web interface features a premium dark-mode developer experience:

- **Interactive Sandbox & CSPRNG Generator** — Generate cryptographically secure secrets with configurable lengths, character sets, and custom signature prefixes. Includes real-time Shannon Entropy computation and brute-force cracking estimates.
- **Custom Rule Tester & YAML Generator** — Test custom regular expressions against code payloads. Validates regex syntax and generates `.securify.toml` rule configurations.
- **Live Hook Security Simulator** — Paste code fragments to test the engine's built-in detection rules. Simulates commit blockage with precise matched tokens, line offsets, and rule severities.
- **Signature Database (Rules Reference)** — Browse built-in security signatures (AWS, Supabase, Stripe, GCP, GitHub PATs, Slack Webhooks, etc.) with remediation guides.
- **Dashboard** — Run real client-side scans on local folders directly from the browser.

## CLI Installation

### Cargo
```bash
cargo install securify
```

### npm
```bash
npm install -g @securify/cli
```

### Homebrew
```bash
brew install securify-cli/securify/securify
```

### From Source
```bash
git clone https://github.com/sandrotonal/anti_security
cd anti_security/cli
cargo build --release
./target/release/securify --help
```

## CLI Usage

```bash
# Scan current directory
securify scan .

# Scan with JSON output
securify scan ./src --format json

# List all detection rules
securify rules

# Initialize git pre-commit hook
securify init-hook

# Check entropy of a string
securify entropy "sk_test_51N34ghJkL90AcdSfErtYuiOp"
```

## Web App Development

```bash
npm install
npm run dev
```

## Project Structure

```
/
├── cli/                  # Rust CLI
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs       # CLI entry point
│       ├── scanner.rs    # Scanning engine
│       ├── rules.rs      # Detection rules
│       ├── entropy.rs    # Shannon entropy calculator
│       ├── hook.rs       # Git hook manager
│       ├── report.rs     # Output formatter
│       └── config.rs     # TOML config parser
├── src/                  # React web app
│   ├── components/       # UI components
│   └── ...
├── index.html
├── package.json
└── vite.config.ts
```

## License

MIT
