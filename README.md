# Securify

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-black?style=flat-round" alt="License" />
  <img src="https://img.shields.io/badge/version-1.0.0-black?style=flat-round" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Vite%20%7C%20React%20%7C%20Tailwind-blue?style=flat-round" alt="Platform" />
  <img src="https://img.shields.io/badge/CLI-Rust-orange?style=flat-round" alt="CLI" />
</p>

**Securify** is a client-side credential leak detection suite. It scans codebases for API keys, database credentials, and cloud tokens before they reach production — all running locally on your machine.

---

## Core Features & Web Application

The interactive web interface features a premium dark-mode developer experience, optimized for speed, clarity, and product-led growth (PLG):

- **Interactive Sandbox & Git Pre-Commit Simulator** — Test core rules on standard code templates. Includes a 3-step visual stepper (`01 choose/edit code`, `02 trigger git commit`, `03 auto-fix credentials`), file-type tab icons (TS, Py, JSON, Go, YAML, Env), and semantic color-coded CLI status consoles (red for blocked, green for passed, yellow for bypassed).
- **Background Web Worker Scanning Engine** — Offloads folder audits to a concurrent pool of up to 8 Web Workers, preventing main browser thread freezes during large directory scans.
- **Active Token Verification Serverless API** — Securely checks whether flagged credentials (Stripe, GitHub PAT, AWS, GCP, Supabase, Slack Webhooks) are active or revoked in real-time by querying provider endpoints via `/api/verify-secret.ts`.
- **One-Click PLG Evaluation (Demo Project)** — Simulates staging scans with pre-configured mock credentials in the browser, showing the Web Worker scanning and active validation badges instantly.
- **Interactive Sandbox & CSPRNG Generator** — Generate cryptographically secure secrets with configurable lengths, character sets, and custom signature prefixes. Includes real-time Shannon Entropy computation and brute-force cracking estimates.
- **Custom Rule Tester & YAML Generator** — Test custom regular expressions against code payloads. Validates regex syntax and generates `.securify.toml` rule configurations.
- **Signature Database (Rules Reference)** — Browse built-in security signatures with remediation guides and emergency rotation steps.
- **Dashboard Onboarding & Ignore Glob Parser** — Visually guides new users with an onboarding banner. The folder scanner automatically parses `.gitignore` and `.securifyignore` configurations, dynamically converting glob rules to regex rules to skip files in Web Worker scans.
- **CI/CD Pipeline Generator** — Visually construct workflow YAML configuration templates for GitHub Actions and GitLab CI/CD with customizable event triggers and branch targeting.
- **Official Audit PDF Print Template** — Clean, high-contrast `@media print` CSS template optimized for printing official compliance reports directly from the browser (Ctrl+P / Save as PDF).
- **Brand Integrations Marquee** — Sleek infinite scroll marquee containing authentic brand SVG icons (GitHub, AWS, Supabase, Stripe, Slack, Vercel, GitLab, GCP, PostgreSQL) with interactive brand-specific neon drop-shadows and hover animations.

---

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

---

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

---

## Web App Development

```bash
npm install
npm run dev
```

---

## Project Structure

```
/
├── api/                  # Vercel serverless functions
│   └── verify-secret.ts  # Active secret token verifier
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

---

## Security & Architecture Audit

Securify is designed with a **Security-First** methodology, conforming to OWASP Top 10 guidelines and strict cryptographic validation patterns:

1. **Zero-Knowledge Code Processing:** Your source code never leaves your local machine. Scanning, regular expression checks, and Shannon Entropy calculations run entirely client-side inside a secure browser context or via local CLI commands.
2. **SSRF (Server-Side Request Forgery) Defenses:** The site auditor API ([scan-site.ts](api/scan-site.ts)) resolves target domains using dynamic DNS lookup and filters out all loopback (127.0.0.1, ::1) and private IP ranges (RFC 1918) before initiating requests, preventing internal network scanning exploits.
3. **Active API Verification Endpoint:** The serverless active token verifier ([verify-secret.ts](api/verify-secret.ts)) securely queries third-party credential providers server-side to prevent exposing developer API keys or bypassing checks.
4. **Payment Integrity & Cryptographic Validation:** All Shopier transactions are cryptographically signed. The checkout API ([create-checkout.ts](api/create-checkout.ts)) calculates HMAC-SHA256 signatures, and the webhook callback API ([shopier-callback.ts](api/shopier-callback.ts)) validates incoming payloads with the merchant `SHOPIER_WEBHOOK_TOKEN` to prevent fake order completion.
5. **Access Control & Session Tokens:** Account activations utilize standard cryptographically signed JSON Web Tokens (JWT) signed with a securely generated `JWT_SECRET` environment variable, ensuring token integrity and preventing modification.
6. **XSS & Injection Protection:** Output rendering is managed by React's native safe encoding layer, escaping potentially malicious strings.

---

## License

MIT
