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
- **Dashboard (Enterprise Upgrades)** — Run real client-side scans on local folders directly from the browser:
  - **`.gitignore` & `.securifyignore` Parsing** — Automatically reads local project ignore lists, dynamically translates glob rules to regular expressions, and skips files for maximized performance and zero false positives.
  - **Compliance & Severity Bar Graphs** — Categorizes leaks into *Critical*, *High*, and *Warning* categories, displaying real-time statistics with micro-animated percentage breakdown graphs.
- **CI/CD Pipeline Generator** — Visually construct workflow YAML configuration templates for GitHub Actions and GitLab CI/CD with customizable event triggers and branch targeting.
- **Official Audit PDF Print Template** — Clean, high-contrast `@media print` CSS template optimized for printing official compliance reports directly from the browser (Ctrl+P / Save as PDF).
- **Brand Integrations Marquee** — Sleek infinite scroll marquee containing authentic, responsive brand SVG icons (GitHub, AWS, Supabase, Stripe, Slack, Vercel, GitLab, GCP, PostgreSQL) with interactive brand-specific neon drop-shadows and hover animations.

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
