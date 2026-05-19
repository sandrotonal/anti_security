# securify

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-black?style=flat-round" alt="License" />
  <img src="https://img.shields.io/badge/version-2.4.0-black?style=flat-round" alt="Version" />
  <img src="https://img.shields.io/badge/coverage-100%25-black?style=flat-round" alt="Coverage" />
</p>

**securify** is an ultra-fast, local-first open-source command line tool (CLI) and git pre-commit hook designed to inspect your repository changes and prevent API keys, database credentials, and cloud tokens from leaking to public version control systems.

Unlike SaaS products, **securify** runs 100% offline on your local CPU. Your code and credentials never leave your machine.

---

## Features

- **pre-commit hook gateway**: automatically intercepts `git commit` commands and aborts the operation if credentials are identified.
- **entropy signature analysis**: matches high-entropy strings (e.g. JWT tokens, private keys) using Shannon entropy analysis.
- **20+ built-in rules**: preset signatures for AWS, Supabase, Stripe, GCP, GitHub PATs, Slack webhooks, and database connection strings.
- **zero latency**: written in optimized native code to complete hook scans in under 20 milliseconds.
- **smart ignore configuration**: skip verified secrets easily using `# securify:ignore` inline comments or a `.securify_bypass` configuration.

---

## Installation

### macOS / Linux
Install securify locally using our automated curl script:
```bash
curl -fsSL https://securify.dev/install.sh | sh
```

### Windows (PowerShell)
Execute the installation payload via PowerShell:
```powershell
iwr -useb https://securify.dev/install.ps1 | iex
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

You can customize the parser settings using a `securify.toml` file at the root of your project:

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
  regex = "jwt_token_[a-zA-Z0-9]{32}"
  severity = "high"
```

### Bypassing Secrets

To bypass security filters for tests or development environment mocks, append a `# securify:ignore` comment to the end of the line containing the key:

```typescript
const testApiKey = "sk_test_51N34ghJkL90AcdSfErtYuiOp"; // securify:ignore
```

---

## License

This project is licensed under the MIT License. Feel free to use, modify, and contribute.
