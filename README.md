<div align="center">

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="96" height="96" fill="none">
  <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" fill="#10b981"/>
</svg>

# Securify

### Enterprise-Grade Zero-Knowledge Secret Scanner & CVE Dependency Auditor

[![npm version](https://img.shields.io/npm/v/securify-cli.svg?style=flat-square&color=10b981)](https://www.npmjs.com/package/securify-cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Rust](https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=black)](https://www.rust-lang.org/)
[![SARIF 2.1.0](https://img.shields.io/badge/SARIF-2.1.0-8A2BE2?style=flat-square)](https://sarifweb.azurewebsites.net/)
[![OWASP Top 10](https://img.shields.io/badge/OWASP-Compliant-000000?style=flat-square&logo=owasp&logoColor=white)](https://owasp.org/)

**Securify** is a high-performance, client-side static security analysis platform and command-line tool designed to detect hardcoded secrets, credential leaks, and supply chain CVE vulnerabilities before they reach production.

[Live Web Platform](https://securify.gucluyumhe.dev) &bull; [npm Package](https://www.npmjs.com/package/securify-cli) &bull; [Documentation](https://securify.gucluyumhe.dev) &bull; [Security Policy](public/security-policy.html)

</div>

---

## Overview

Securify delivers zero-knowledge security scanning directly in the browser and across modern CI/CD pipelines. Source code never leaves the local execution boundary: pattern matching, Shannon entropy calculations, and git diff audits are performed entirely on-device or within sandboxed Web Workers.

### Core Capabilities

- **Zero-Knowledge SAST Engine**: Audits 40+ credential types across 30+ file formats without transmitting source code to external servers.
- **Supply Chain CVE/OSV Auditing**: Resolves dependencies against OSV.dev and GitHub Advisory databases using an internal semver range engine.
- **SARIF 2.1.0 & Code Scanning Export**: Emits standardized SARIF output compatible with GitHub Code Scanning, SonarQube, and GitLab Security Center.
- **Git Sentinel & Pre-Commit Hardening**: Intercepts committed secrets with stage-only (`--staged`) delta scans and automated git hook generation.
- **Enterprise Web Interface**: Interactive terminal sandbox, live website SSRF-safe vulnerability inspector, and real-time GitHub repository scanning.

---

## Quick Start

### 1. Instant Execution (Zero Installation)

Run a zero-configuration audit against your current working directory:

```bash
npx securify-cli scan .
```

### 2. Dependency Vulnerability Audit

Scan package manifests for known CVEs and supply chain advisories:

```bash
npx securify-cli scan . --dependencies
```

### 3. Generate SARIF for CI/CD Pipelines

Export structured findings for GitHub Code Scanning or security dashboards:

```bash
npx securify-cli scan . --format sarif --output securify-report.sarif
```

### 4. Generate Markdown Summary Table

Export formatted audit tables for pull request comments or documentation:

```bash
npx securify-cli scan . --format markdown --output audit-report.md
```

### 5. Global Installation

Install globally on your workstation:

```bash
npm install -g securify-cli
securify scan .
```

---

## Command-Line Interface (CLI)

```
USAGE:
  securify [options]

OPTIONS:
  -p, --path <path>          Target directory to scan (default: current directory)
  -o, --output <file>        Output file destination
  -f, --format <format>      Output format: text, json, sarif, markdown (default: text)
  -s, --severity <level>     Minimum severity threshold: critical, high, medium, low
  -e, --exclude <pattern>    Exclude pattern or directory path
  --include-tests            Include test suites and fixtures in analysis
  -d, --dependencies         Enable dependency vulnerability scanning (CVE / OSV)
  --verbose                  Enable verbose debugging output
  -h, --help                 Display help information
  -v, --version              Display CLI version
```

---

## GitHub Actions CI/CD Integration

Embed Securify directly into your deployment pipeline with automated pull request comments and GitHub Security alerts:

```yaml
name: Securify Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  security-scan:
    name: Secrets & CVE Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Securify Scanner
        run: |
          mkdir -p scan-results
          npx securify-cli scan . --format sarif --output scan-results/securify.sarif --dependencies

      - name: Upload SARIF to GitHub Code Scanning
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: scan-results/securify.sarif
          category: securify-scanner
```

---

## Detection Coverage

Securify includes curated regular expression patterns calibrated with Shannon entropy thresholds and confidence scoring:

| Category | Target Secret / Credential Type | Confidence | Severity |
| :--- | :--- | :--- | :--- |
| **Cloud Infrastructure** | AWS Access Key ID (`AKIA...`), AWS Secret Access Key | High | Critical |
| **Cloud Infrastructure** | Google Cloud API Keys (`AIzaSy...`), GCP Service Account Keys | High | High |
| **Cloud Infrastructure** | Azure Shared Access Keys, Azure DevOps Tokens | High | Critical |
| **Payment Processors** | Stripe Secret Keys (`sk_live_...`, `sk_test_...`), Webhook Secrets | High | Critical |
| **Payment Processors** | Square Access Tokens, PayPal Client Credentials | High | Critical |
| **Source Control** | GitHub Personal Access Tokens (`ghp_...`, `gho_...`), Fine-Grained Tokens | High | High |
| **Source Control** | GitLab Personal & Pipeline Tokens (`glpat-...`) | High | High |
| **Databases** | PostgreSQL, MySQL, MongoDB, Redis, Supabase Service Role JWTs | High | Critical |
| **Cryptographic Keys** | RSA, DSA, EC, PGP, OpenSSH Private Key Blocks | High | Critical |
| **Messaging & SaaS** | Slack Webhook URLs, SendGrid API Keys, Twilio Tokens | High | High |
| **Generic Secrets** | High-Entropy Passwords, Auth Tokens, Generic API Keys | Medium | Medium |

### False Positive Suppression

To intentionally bypass detection on specific lines (such as mock fixtures or documentation references), add an inline suppression comment:

```javascript
const exampleKey = "AKIAIOSFODNN7EXAMPLE"; // securify:ignore
```

---

## Supported Ecosystems & Manifests

Securify audits supply chain risks across all primary language ecosystems:

| Ecosystem | Manifest File | Vulnerability Source |
| :--- | :--- | :--- |
| **Node.js** | `package.json`, `package-lock.json` | OSV.dev, GitHub Advisory |
| **Python** | `requirements.txt`, `Pipfile.lock` | PyPI OSV, GitHub Advisory |
| **Go** | `go.mod` | Go Vulnerability Database |
| **Rust** | `Cargo.toml`, `Cargo.lock` | RustSec Advisory Database |
| **Java** | `pom.xml` | Maven Central Advisory |
| **PHP** | `composer.json`, `composer.lock` | Packagist Advisory |
| **Ruby** | `Gemfile.lock` | RubySec Advisory Database |

---

## Architectural & Security Standards

### 1. Server-Side Request Forgery (SSRF) Defense
The website scanner API (`api/scan-site.ts`) implements strict octet-based CIDR validation:
- Rejects RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Rejects Loopback (`127.0.0.0/8`, `::1`), Cloud Metadata (`169.254.169.254`), and CGNAT (`100.64.0.0/10`).
- Performs literal IP parsing prior to DNS queries to defeat DNS rebinding.
- Enforces per-hop IP verification across manual HTTP redirect chains.

### 2. Live Secret Verification
Active secret verification endpoints (`api/verify-secret.ts`) strictly isolate verified providers (GitHub, Stripe, Google, Supabase) and return structured status contracts (`active`, `inactive`, `unsupported`) without exposing internal server tokens.

### 3. Cryptographic Verification
Payment and billing verification pipelines are protected by HMAC-SHA256 signature checking and fail-closed JSON Web Token (JWT) secret validation.

---

## Project Structure

```
.
├── api/                  # Vercel serverless edge functions
│   ├── scan-site.ts      # SSRF-protected website vulnerability analyzer
│   ├── verify-secret.ts  # Active provider credential validator
│   ├── verify-token.ts   # Cryptographic JWT authentication handler
│   └── webhook.ts        # Payment webhook HMAC-SHA256 receiver
├── bin/                  # Standalone CLI executables
│   └── securify.mjs      # Zero-dependency bundled CLI binary
├── cli/                  # Native Rust CLI engine
│   ├── Cargo.toml
│   └── src/              # Native scanner, rules, and hook modules
├── src/
│   ├── cli/              # TypeScript CLI source & SARIF/Markdown exporters
│   ├── components/       # Enterprise React 18 UI components
│   ├── lib/              # Scan engine, CVE database, and filter utilities
│   └── workers/          # Multithreaded Web Worker scan pipelines
├── tests/                # Node.js native security test suite
├── package.json
└── vite.config.ts
```

---

## Verification & Quality Gates

Securify enforces rigorous static analysis and automated security tests:

```bash
# Execute native security test suite (SSRF, Semver, Engine, SARIF)
npm test

# Verify strict TypeScript type checking
npm run typecheck

# Execute ESLint static analysis
npm run lint

# Compile production web bundles and standalone CLI binary
npm run build
```

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.
