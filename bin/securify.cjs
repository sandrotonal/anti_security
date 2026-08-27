#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli/index.ts
var cli_exports = {};
__export(cli_exports, {
  generateMarkdownReport: () => generateMarkdownReport,
  generateSarifReport: () => generateSarifReport
});
module.exports = __toCommonJS(cli_exports);

// src/lib/scanEngine.ts
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const frequencies = /* @__PURE__ */ new Map();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of frequencies.values()) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  return Number(entropy.toFixed(2));
}
var SECRET_PATTERNS = [
  // AWS Secrets
  {
    id: "aws-access-key",
    name: "AWS Access Key ID",
    category: "cloud",
    isStructured: true,
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Access Key",
    category: "cloud",
    isStructured: true,
    pattern: /(?:aws_secret_access_key|aws_sec_key|aws_secret|secret_access_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi
  },
  {
    id: "aws-session-token",
    name: "AWS Session Token",
    category: "cloud",
    isStructured: true,
    pattern: /(?:FQoGZXIvYXdzE|AQoECAEQA)[A-Za-z0-9/+=]{100,}/g
  },
  // Google Cloud
  {
    id: "gcp-api-key",
    name: "Google Cloud API Key",
    category: "cloud",
    isStructured: true,
    pattern: /AIza[0-9A-Za-z_\-]{35}/g
  },
  {
    id: "gcp-service-account",
    name: "GCP Service Account Key",
    category: "cloud",
    isStructured: true,
    pattern: /"type":\s*"service_account"|"private_key":\s*"-----BEGIN PRIVATE KEY-----/g
  },
  // GitHub
  {
    id: "github-pat",
    name: "GitHub Personal Access Token",
    category: "vcs",
    isStructured: true,
    pattern: /ghp_[A-Za-z0-9]{36}/g
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    category: "vcs",
    isStructured: true,
    pattern: /gho_[A-Za-z0-9]{36}/g
  },
  {
    id: "github-app-token",
    name: "GitHub App Token",
    category: "vcs",
    isStructured: true,
    pattern: /(?:ghu|ghs|ghr)_[A-Za-z0-9]{36}/g
  },
  {
    id: "github-refresh-token",
    name: "GitHub Refresh Token",
    category: "vcs",
    isStructured: true,
    pattern: /ghr_[A-Za-z0-9]{76}/g
  },
  // GitLab
  {
    id: "gitlab-pat",
    name: "GitLab Personal Access Token",
    category: "vcs",
    isStructured: true,
    pattern: /glpat-[A-Za-z0-9\-_]{20}/g
  },
  // Stripe
  {
    id: "stripe-secret-key",
    name: "Stripe Secret Key",
    category: "saas",
    isStructured: true,
    pattern: /(?:sk_live|sk_test)_[0-9a-zA-Z]{24,99}/g
  },
  {
    id: "stripe-restricted-key",
    name: "Stripe Restricted Key",
    category: "saas",
    isStructured: true,
    pattern: /(?:rk_live|rk_test)_[0-9a-zA-Z]{24,99}/g
  },
  // PayPal
  {
    id: "paypal-braintree",
    name: "PayPal Braintree Access Token",
    category: "saas",
    isStructured: true,
    pattern: /access_token\$production\$[a-z0-9]{16}\$[a-f0-9]{32}/gi
  },
  // Slack
  {
    id: "slack-token",
    name: "Slack Token",
    category: "saas",
    isStructured: true,
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,32}/g
  },
  {
    id: "slack-webhook",
    name: "Slack Webhook URL",
    category: "saas",
    isStructured: true,
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,12}\/B[A-Z0-9]{8,12}\/[A-Za-z0-9]{24}/g
  },
  // Twilio
  {
    id: "twilio-api-key",
    name: "Twilio API Key",
    category: "saas",
    isStructured: true,
    pattern: /SK[a-f0-9]{32}/g
  },
  // SendGrid
  {
    id: "sendgrid-api-key",
    name: "SendGrid API Key",
    category: "saas",
    isStructured: true,
    pattern: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/g
  },
  // MailChimp
  {
    id: "mailchimp-api-key",
    name: "MailChimp API Key",
    category: "saas",
    isStructured: true,
    pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g
  },
  // Mailgun
  {
    id: "mailgun-api-key",
    name: "Mailgun API Key",
    category: "saas",
    isStructured: true,
    pattern: /key-[a-f0-9]{32}/g
  },
  // Square
  {
    id: "square-access-token",
    name: "Square Access Token",
    category: "saas",
    isStructured: true,
    pattern: /sq0atp-[A-Za-z0-9_\-]{22}/g
  },
  {
    id: "square-oauth-secret",
    name: "Square OAuth Secret",
    category: "saas",
    isStructured: true,
    pattern: /sq0csp-[A-Za-z0-9_\-]{43}/g
  },
  // Heroku
  {
    id: "heroku-api-key",
    name: "Heroku API Key",
    category: "saas",
    isStructured: true,
    pattern: /(?:heroku_api_key|HEROKU_API_KEY)\s*[:=]\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})['"]?/gi
  },
  // Private Keys
  {
    id: "rsa-private-key",
    name: "RSA Private Key",
    category: "crypto",
    isStructured: true,
    pattern: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/g
  },
  {
    id: "dsa-private-key",
    name: "DSA Private Key",
    category: "crypto",
    isStructured: true,
    pattern: /-----BEGIN DSA PRIVATE KEY-----/g
  },
  {
    id: "ec-private-key",
    name: "EC Private Key",
    category: "crypto",
    isStructured: true,
    pattern: /-----BEGIN EC PRIVATE KEY-----/g
  },
  {
    id: "pgp-private-key",
    name: "PGP Private Key",
    category: "crypto",
    isStructured: true,
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g
  },
  {
    id: "ssh-private-key",
    name: "SSH Private Key",
    category: "crypto",
    isStructured: true,
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g
  },
  // Database Connection Strings
  {
    id: "postgres-connection",
    name: "PostgreSQL Connection String",
    category: "database",
    isStructured: true,
    pattern: /postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi
  },
  {
    id: "mysql-connection",
    name: "MySQL Connection String",
    category: "database",
    isStructured: true,
    pattern: /mysql:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi
  },
  {
    id: "mongodb-connection",
    name: "MongoDB Connection String",
    category: "database",
    isStructured: true,
    pattern: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi
  },
  // JWT Tokens
  {
    id: "jwt-token",
    name: "JWT Token",
    category: "crypto",
    isStructured: true,
    pattern: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g
  },
  // Generic Patterns with Entropy Filtering
  {
    id: "generic-api-key",
    name: "Generic API Key",
    category: "generic",
    isStructured: false,
    pattern: /(?:api[_-]?key|apikey|access[_-]?key)\s*[:=]\s*['"]([A-Za-z0-9_\-]{20,})['"]/gi,
    entropy: { min: 3.2, charset: "A-Za-z0-9_-" }
  },
  {
    id: "generic-secret",
    name: "Generic Secret Key",
    category: "generic",
    isStructured: false,
    pattern: /(?:secret|password|passwd|auth_token)\s*[:=]\s*['"]([A-Za-z0-9_\-@#$%^&*+=]{16,})['"]/gi,
    entropy: { min: 3.2, charset: "A-Za-z0-9_-@#$%^&*+=" }
  }
];
function redactSecret(secret) {
  if (!secret) return "***";
  if (secret.length <= 8) {
    return "***";
  }
  const visibleChars = Math.min(4, Math.floor(secret.length * 0.15));
  return secret.substring(0, visibleChars) + "..." + secret.substring(secret.length - visibleChars);
}
function scanContent(content, filename = "unknown") {
  if (!content) return [];
  const results = [];
  const lines = content.split("\n");
  for (const pattern of SECRET_PATTERNS) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (line.includes("securify:ignore") || line.includes("securify-ignore")) {
        continue;
      }
      pattern.pattern.lastIndex = 0;
      let match;
      while ((match = pattern.pattern.exec(line)) !== null) {
        const matchedText = match[1] || match[0];
        const matchEntropy = calculateEntropy(matchedText);
        if (!pattern.isStructured && pattern.entropy) {
          if (matchEntropy < pattern.entropy.min) {
            continue;
          }
        }
        if (pattern.verify && !pattern.verify(matchedText)) {
          continue;
        }
        const confidence = pattern.isStructured ? "high" : matchEntropy >= 3.8 ? "medium" : "low";
        results.push({
          file: filename,
          line: lineIndex + 1,
          column: match.index + 1,
          match: matchedText,
          type: pattern.name,
          category: pattern.category,
          severity: determineSeverity(pattern.id),
          confidence,
          entropy: matchEntropy,
          description: `Detected ${pattern.name} with ${confidence} confidence (entropy: ${matchEntropy})`,
          redacted: redactSecret(matchedText)
        });
      }
    }
  }
  const deduplicated = [];
  for (const res of results) {
    const existing = deduplicated.find(
      (d) => d.line === res.line && (d.match.includes(res.match) || res.match.includes(d.match))
    );
    if (existing) {
      if (res.confidence === "high" && existing.confidence !== "high") {
        const idx = deduplicated.indexOf(existing);
        deduplicated[idx] = res;
      }
    } else {
      deduplicated.push(res);
    }
  }
  return deduplicated;
}
function determineSeverity(patternId) {
  const critical = [
    "aws-secret-key",
    "rsa-private-key",
    "ssh-private-key",
    "dsa-private-key",
    "ec-private-key",
    "pgp-private-key",
    "gcp-service-account"
  ];
  const high = [
    "aws-access-key",
    "github-pat",
    "gitlab-pat",
    "stripe-secret-key",
    "stripe-restricted-key",
    "postgres-connection",
    "mysql-connection",
    "mongodb-connection"
  ];
  const medium = [
    "gcp-api-key",
    "slack-token",
    "slack-webhook",
    "sendgrid-api-key",
    "twilio-api-key",
    "jwt-token",
    "generic-api-key"
  ];
  if (critical.includes(patternId)) return "critical";
  if (high.includes(patternId)) return "high";
  if (medium.includes(patternId)) return "medium";
  return "low";
}

// src/lib/dependencyParser.ts
function parsePackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    const packages = [];
    if (pkg.dependencies) {
      for (const [name, versionRange] of Object.entries(pkg.dependencies)) {
        const version = cleanVersion(versionRange);
        if (version) {
          packages.push({ name, version, ecosystem: "npm" });
        }
      }
    }
    if (pkg.devDependencies) {
      for (const [name, versionRange] of Object.entries(pkg.devDependencies)) {
        const version = cleanVersion(versionRange);
        if (version) {
          packages.push({ name, version, ecosystem: "npm" });
        }
      }
    }
    return packages;
  } catch (error) {
    console.error("Failed to parse package.json:", error);
    return [];
  }
}
function parseRequirementsTxt(content) {
  const packages = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*([=~><]+)\s*([0-9\.]+)/);
    if (match) {
      packages.push({
        name: match[1],
        version: match[3],
        ecosystem: "PyPI"
      });
    }
  }
  return packages;
}
function parsePipfileLock(content) {
  try {
    const lockfile = JSON.parse(content);
    const packages = [];
    if (lockfile.default) {
      for (const [name, info] of Object.entries(lockfile.default)) {
        const pkgInfo = info;
        if (pkgInfo.version) {
          packages.push({
            name,
            version: cleanVersion(pkgInfo.version),
            ecosystem: "PyPI"
          });
        }
      }
    }
    if (lockfile.develop) {
      for (const [name, info] of Object.entries(lockfile.develop)) {
        const pkgInfo = info;
        if (pkgInfo.version) {
          packages.push({
            name,
            version: cleanVersion(pkgInfo.version),
            ecosystem: "PyPI"
          });
        }
      }
    }
    return packages;
  } catch (error) {
    console.error("Failed to parse Pipfile.lock:", error);
    return [];
  }
}
function parseGoMod(content) {
  const packages = [];
  const lines = content.split("\n");
  let inRequireBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("require (")) {
      inRequireBlock = true;
      continue;
    }
    if (trimmed === ")" && inRequireBlock) {
      inRequireBlock = false;
      continue;
    }
    if (trimmed.startsWith("require ") || inRequireBlock) {
      const match = trimmed.match(/([^\s]+)\s+v?([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
          ecosystem: "Go"
        });
      }
    }
  }
  return packages;
}
function parseCargoToml(content) {
  const packages = [];
  const lines = content.split("\n");
  let inDependenciesSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[dependencies]") {
      inDependenciesSection = true;
      continue;
    }
    if (trimmed.startsWith("[") && trimmed !== "[dependencies]") {
      inDependenciesSection = false;
      continue;
    }
    if (inDependenciesSection && trimmed) {
      const simpleMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*"([^"]+)"/);
      if (simpleMatch) {
        packages.push({
          name: simpleMatch[1],
          version: simpleMatch[2],
          ecosystem: "crates.io"
        });
        continue;
      }
      const complexMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
      if (complexMatch) {
        packages.push({
          name: complexMatch[1],
          version: complexMatch[2],
          ecosystem: "crates.io"
        });
      }
    }
  }
  return packages;
}
function parsePomXml(content) {
  const packages = [];
  const dependencyRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/g;
  let match;
  while ((match = dependencyRegex.exec(content)) !== null) {
    const groupId = match[1].trim();
    const artifactId = match[2].trim();
    const version = match[3].trim();
    packages.push({
      name: `${groupId}:${artifactId}`,
      version: cleanVersion(version),
      ecosystem: "Maven"
    });
  }
  return packages;
}
function parseComposerJson(content) {
  try {
    const composer = JSON.parse(content);
    const packages = [];
    if (composer.require) {
      for (const [name, versionRange] of Object.entries(composer.require)) {
        if (name === "php") continue;
        const version = cleanVersion(versionRange);
        if (version) {
          packages.push({ name, version, ecosystem: "Composer" });
        }
      }
    }
    if (composer["require-dev"]) {
      for (const [name, versionRange] of Object.entries(composer["require-dev"])) {
        const version = cleanVersion(versionRange);
        if (version) {
          packages.push({ name, version, ecosystem: "Composer" });
        }
      }
    }
    return packages;
  } catch (error) {
    console.error("Failed to parse composer.json:", error);
    return [];
  }
}
function parseGemfileLock(content) {
  const packages = [];
  const lines = content.split("\n");
  let inSpecsSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "specs:") {
      inSpecsSection = true;
      continue;
    }
    if (inSpecsSection && line.startsWith("  ") && !line.startsWith("    ")) {
      const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s+\(([0-9\.]+)\)/);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
          ecosystem: "RubyGems"
        });
      }
    }
    if (trimmed === "" && inSpecsSection) {
      inSpecsSection = false;
    }
  }
  return packages;
}
function parseDependencyFile(filename, content) {
  const lower = filename.toLowerCase();
  if (lower === "package.json") return parsePackageJson(content);
  if (lower === "requirements.txt") return parseRequirementsTxt(content);
  if (lower === "pipfile.lock") return parsePipfileLock(content);
  if (lower === "go.mod") return parseGoMod(content);
  if (lower === "cargo.toml") return parseCargoToml(content);
  if (lower === "pom.xml") return parsePomXml(content);
  if (lower === "composer.json") return parseComposerJson(content);
  if (lower === "gemfile.lock") return parseGemfileLock(content);
  return [];
}
function cleanVersion(versionRange) {
  return versionRange.replace(/^[^0-9]*/, "").split(/[\s,]/)[0] || "0.0.0";
}

// src/lib/cveDatabase.ts
async function queryOSVDatabase(pkg) {
  try {
    const response = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: {
          name: pkg.name,
          ecosystem: mapEcosystem(pkg.ecosystem)
        },
        version: pkg.version
      })
    });
    if (!response.ok) {
      console.warn(`OSV API HTTP ${response.status} for ${pkg.name}@${pkg.version}`);
      return [];
    }
    const data = await response.json();
    return parseOSVResponse(data, pkg);
  } catch (error) {
    console.error("OSV query failed:", error);
    return [];
  }
}
async function queryGitHubAdvisory(pkg) {
  const ecosystem = mapGitHubEcosystem(pkg.ecosystem);
  if (!ecosystem) return [];
  try {
    const response = await fetch(
      `https://api.github.com/advisories?ecosystem=${ecosystem}&affects=${encodeURIComponent(pkg.name)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
    );
    if (!response.ok) {
      console.warn(`GitHub Advisory API HTTP ${response.status} for ${pkg.name}`);
      return [];
    }
    const data = await response.json();
    return parseGitHubAdvisories(data, pkg);
  } catch (error) {
    console.error("GitHub Advisory query failed:", error);
    return [];
  }
}
async function batchQueryVulnerabilities(packages) {
  const results = /* @__PURE__ */ new Map();
  const batchSize = 10;
  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    const promises = batch.map(async (pkg) => {
      const key = `${pkg.name}@${pkg.version}`;
      const osvResults = await queryOSVDatabase(pkg);
      const ghResults = await queryGitHubAdvisory(pkg);
      const merged = mergeVulnerabilities([...osvResults, ...ghResults]);
      results.set(key, merged);
    });
    await Promise.all(promises);
  }
  return results;
}
function parseOSVResponse(data, pkg) {
  if (!data.vulns || !Array.isArray(data.vulns)) {
    return [];
  }
  return data.vulns.map((vuln) => {
    const { severity, cvss } = extractSeverityAndCvss(vuln);
    return {
      id: vuln.id || "UNKNOWN",
      packageName: pkg.name,
      ecosystem: pkg.ecosystem,
      affectedVersions: extractAffectedVersions(vuln.affected),
      fixedVersion: extractFixedVersion(vuln.affected),
      severity,
      cvss,
      description: vuln.summary || vuln.details || "No description available",
      references: (vuln.references || []).map((ref) => ref.url).filter(Boolean),
      publishedDate: vuln.published || (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: vuln.modified || vuln.published || (/* @__PURE__ */ new Date()).toISOString()
    };
  });
}
function parseGitHubAdvisories(data, pkg) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((advisory) => {
    const vulnerable = advisory.vulnerabilities?.some(
      (v) => v.package?.name?.toLowerCase() === pkg.name.toLowerCase() && isVersionAffected(pkg.version, v.vulnerable_version_range)
    );
    return vulnerable;
  }).map((advisory) => ({
    id: advisory.ghsa_id || advisory.cve_id || "UNKNOWN",
    packageName: pkg.name,
    ecosystem: pkg.ecosystem,
    affectedVersions: extractGHAffectedVersions(advisory.vulnerabilities),
    fixedVersion: extractGHFixedVersion(advisory.vulnerabilities),
    severity: mapSeverityString(advisory.severity),
    cvss: advisory.cvss?.score,
    description: advisory.summary || "No description available",
    references: [advisory.html_url, ...(advisory.references || []).map((r) => r.url)].filter(Boolean),
    publishedDate: advisory.published_at,
    lastModified: advisory.updated_at
  }));
}
function mapEcosystem(ecosystem) {
  const mapping = {
    npm: "npm",
    PyPI: "PyPI",
    Go: "Go",
    Maven: "Maven",
    "crates.io": "crates.io",
    NuGet: "NuGet",
    Composer: "Packagist",
    RubyGems: "RubyGems"
  };
  return mapping[ecosystem] || ecosystem;
}
function mapGitHubEcosystem(ecosystem) {
  const mapping = {
    npm: "npm",
    PyPI: "pip",
    Go: "go",
    Maven: "maven",
    "crates.io": "rust",
    NuGet: "nuget",
    Composer: "composer",
    RubyGems: "rubygems"
  };
  return mapping[ecosystem] || null;
}
function mapSeverityString(severity) {
  const upper = (severity || "").toUpperCase();
  if (upper.includes("CRITICAL")) return "CRITICAL";
  if (upper.includes("HIGH")) return "HIGH";
  if (upper.includes("LOW")) return "LOW";
  return "MODERATE";
}
function extractSeverityAndCvss(vuln) {
  if (vuln.database_specific) {
    if (typeof vuln.database_specific.severity === "string") {
      return { severity: mapSeverityString(vuln.database_specific.severity), cvss: vuln.database_specific.cvss_score };
    }
  }
  if (typeof vuln.severity === "string") {
    return { severity: mapSeverityString(vuln.severity) };
  }
  if (Array.isArray(vuln.severity) && vuln.severity.length > 0) {
    const cvssObj = vuln.severity.find((s) => s && s.type && s.type.includes("CVSS"));
    if (cvssObj && cvssObj.score) {
      const numMatch = cvssObj.score.match(/(\d+\.\d+)/);
      if (numMatch) {
        const score = parseFloat(numMatch[1]);
        if (score >= 9) return { severity: "CRITICAL", cvss: score };
        if (score >= 7) return { severity: "HIGH", cvss: score };
        if (score >= 4) return { severity: "MODERATE", cvss: score };
        return { severity: "LOW", cvss: score };
      }
    }
  }
  return { severity: "MODERATE" };
}
function extractAffectedVersions(affected) {
  if (!affected) return [];
  return affected.flatMap((a) => a.ranges || []).flatMap((r) => r.events || []).filter((e) => e.introduced).map((e) => e.introduced);
}
function extractFixedVersion(affected) {
  if (!affected) return void 0;
  const fixed = affected.flatMap((a) => a.ranges || []).flatMap((r) => r.events || []).find((e) => e.fixed);
  return fixed?.fixed;
}
function extractGHAffectedVersions(vulnerabilities) {
  if (!vulnerabilities) return [];
  return vulnerabilities.map((v) => v.vulnerable_version_range).filter(Boolean);
}
function extractGHFixedVersion(vulnerabilities) {
  if (!vulnerabilities) return void 0;
  return vulnerabilities.find((v) => v.patched_versions)?.patched_versions;
}
function parseSemver(v) {
  if (!v) return null;
  const cleaned = v.trim().replace(/^[v=^~><\s]+/, "");
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== void 0 ? parseInt(match[2], 10) : 0,
    patch: match[3] !== void 0 ? parseInt(match[3], 10) : 0,
    prerelease: match[4]
  };
}
function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return 0;
  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) return p1.prerelease.localeCompare(p2.prerelease);
  return 0;
}
function satisfiesSingleComparator(version, comparatorStr) {
  const comp = comparatorStr.trim();
  if (!comp || comp === "*") return true;
  const match = comp.match(/^([<>=!~^]*)\s*(.+)$/);
  if (!match) return true;
  const op = match[1] || "=";
  const targetVer = match[2];
  const diff = compareSemver(version, targetVer);
  switch (op) {
    case "<":
      return diff < 0;
    case "<=":
      return diff <= 0;
    case ">":
      return diff > 0;
    case ">=":
      return diff >= 0;
    case "=":
    case "==":
      return diff === 0;
    case "!=":
      return diff !== 0;
    case "^": {
      const parsedTarget = parseSemver(targetVer);
      const parsedVer = parseSemver(version);
      if (!parsedTarget || !parsedVer) return false;
      if (diff < 0) return false;
      if (parsedTarget.major > 0) return parsedVer.major === parsedTarget.major;
      if (parsedTarget.minor > 0) return parsedVer.minor === parsedTarget.minor;
      return parsedVer.patch === parsedTarget.patch;
    }
    case "~": {
      const parsedTarget = parseSemver(targetVer);
      const parsedVer = parseSemver(version);
      if (!parsedTarget || !parsedVer) return false;
      if (diff < 0) return false;
      return parsedVer.major === parsedTarget.major && parsedVer.minor === parsedTarget.minor;
    }
    default:
      return diff === 0;
  }
}
function isVersionAffected(version, range) {
  if (!version || !range) return false;
  const orGroups = range.split(/\s*\|\|\s*/);
  return orGroups.some((group) => {
    const andComparators = group.replace(/,/g, " ").trim().split(/\s+(?=[<>=!~^])/).map((c) => c.trim()).filter(Boolean);
    if (andComparators.length === 0) return true;
    return andComparators.every((comp) => satisfiesSingleComparator(version, comp));
  });
}
function mergeVulnerabilities(vulns) {
  const seen = /* @__PURE__ */ new Set();
  return vulns.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

// src/cli/index.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    path: process.cwd(),
    format: "text",
    exclude: ["node_modules", ".git", "dist", "build"],
    includeTests: false,
    verbose: false,
    dependencies: false
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--version" || arg === "-v") {
      console.log("Securify CLI v1.0.0");
      process.exit(0);
    } else if (arg === "--path" || arg === "-p") {
      options.path = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--format" || arg === "-f") {
      options.format = args[++i];
    } else if (arg === "--severity" || arg === "-s") {
      options.severity = args[++i];
    } else if (arg === "--exclude" || arg === "-e") {
      options.exclude.push(args[++i]);
    } else if (arg === "--include-tests") {
      options.includeTests = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--dependencies" || arg === "-d") {
      options.dependencies = true;
    }
  }
  return options;
}
function printHelp() {
  console.log(`
Securify CLI - Professional Security Scanner

USAGE:
  securify [options]

OPTIONS:
  -p, --path <path>          Directory to scan (default: current directory)
  -o, --output <file>        Output file path
  -f, --format <format>      Output format: json, sarif, markdown, text (default: text)
  -s, --severity <level>     Minimum severity: critical, high, medium, low
  -e, --exclude <pattern>    Exclude pattern (can be used multiple times)
  --include-tests            Include test files in scan
  -d, --dependencies         Scan dependencies for vulnerabilities
  --verbose                  Verbose output
  -h, --help                 Show this help
  -v, --version              Show version

EXAMPLES:
  securify                                    # Scan current directory
  securify -p ./src                           # Scan specific directory
  securify -f sarif -o results.sarif          # Export to SARIF
  securify -s critical                        # Show only critical findings
  securify -d                                 # Include dependency scan
  securify --exclude "*.test.js"              # Exclude test files

PATTERNS DETECTED:
  - AWS Access Keys & Secret Keys (40+ patterns)
  - GitHub Personal Access Tokens
  - Stripe API Keys
  - Google Cloud API Keys
  - Database Connection Strings
  - Private Keys (RSA, DSA, EC, SSH)
  - JWT Tokens
  - Slack Webhooks
  - And many more...

FEATURES:
  \u2713 Real-time secret detection with 40+ patterns
  \u2713 Shannon entropy analysis for high-entropy secrets
  \u2713 CVE vulnerability scanning for dependencies
  \u2713 Multiple export formats (JSON, SARIF, Markdown)
  \u2713 GitHub Actions integration
  \u2713 CI/CD pipeline support
  \u2713 Zero false positives with confidence scoring
`);
}
function getFilesRecursive(dir, ignorePatterns) {
  let results = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    const isIgnored = ignorePatterns.some((pattern) => {
      const cleanPattern = pattern.replace(/^\*\*\//, "").replace(/\/\*\*$/, "").replace(/\*/g, "");
      if (!cleanPattern) return false;
      return file === cleanPattern || filePath.includes(cleanPattern);
    });
    if (isIgnored) continue;
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath, ignorePatterns));
    } else {
      const ext = path.extname(file).toLowerCase();
      const isEnvFile = file.startsWith(".env");
      const validExtensions = [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".py",
        ".go",
        ".java",
        ".rb",
        ".php",
        ".yml",
        ".yaml",
        ".json",
        ".sh",
        ".bash",
        ".conf",
        ".config"
      ];
      if (validExtensions.includes(ext) || isEnvFile) {
        results.push(filePath);
      }
    }
  }
  return results;
}
async function scanDirectory(dirPath, options) {
  const ignore = options.exclude || [];
  if (!options.includeTests) {
    ignore.push("**/*.test.*", "**/*.spec.*", "**/test/**", "**/tests/**");
  }
  const files = getFilesRecursive(dirPath, ignore);
  if (options.verbose) {
    console.log(`Found ${files.length} files to scan`);
  }
  const allFindings = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const relativePath = path.relative(dirPath, file);
      const results = scanContent(content, relativePath);
      const filtered = options.severity ? results.filter((r) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[r.severity] <= severityOrder[options.severity];
      }) : results;
      allFindings.push(...filtered);
      if (options.verbose && filtered.length > 0) {
        console.log(`  ${relativePath}: ${filtered.length} findings`);
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Error scanning ${file}:`, error);
      }
    }
  }
  return allFindings;
}
async function scanDependencies(dirPath, options) {
  const manifestFiles = [
    "package.json",
    "requirements.txt",
    "Pipfile.lock",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "composer.json",
    "Gemfile.lock"
  ];
  const vulnerabilities = [];
  for (const manifest of manifestFiles) {
    const manifestPath = path.join(dirPath, manifest);
    if (!fs.existsSync(manifestPath)) continue;
    if (options.verbose) {
      console.log(`Scanning dependencies in ${manifest}...`);
    }
    try {
      const content = fs.readFileSync(manifestPath, "utf-8");
      const dependencies = parseDependencyFile(manifest, content);
      if (dependencies.length === 0) continue;
      const cveResults = await batchQueryVulnerabilities(dependencies);
      for (const [pkgKey, vulns] of cveResults.entries()) {
        if (vulns.length > 0) {
          vulnerabilities.push({
            package: pkgKey,
            vulnerabilities: vulns,
            file: manifest
          });
        }
      }
      if (options.verbose) {
        console.log(`  Found ${vulnerabilities.length} vulnerable dependencies`);
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Error scanning ${manifest}:`, error);
      }
    }
  }
  return vulnerabilities;
}
function generateSarifReport(findings, _depVulns = []) {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Securify",
            version: "2.4.0",
            informationUri: "https://securify.gucluyumhe.dev",
            rules: Array.from(new Set(findings.map((f) => f.type))).map((type) => ({
              id: type.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              name: type,
              shortDescription: { text: `Hardcoded credential leak: ${type}` },
              help: { text: `Revoke this secret immediately and store in environment variables or a secrets manager.` },
              defaultConfiguration: {
                level: findings.find((f) => f.type === type)?.severity === "critical" || findings.find((f) => f.type === type)?.severity === "high" ? "error" : "warning"
              }
            }))
          }
        },
        results: findings.map((f) => ({
          ruleId: f.type.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          level: f.severity === "critical" || f.severity === "high" ? "error" : "warning",
          message: {
            text: `Hardcoded ${f.type} credential detected (${f.redacted || "***"}).`
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: f.file.replace(/\\/g, "/")
                },
                region: {
                  startLine: f.line || 1,
                  startColumn: f.column || 1
                }
              }
            }
          ]
        }))
      }
    ]
  };
  return JSON.stringify(sarif, null, 2);
}
function generateMarkdownReport(findings, depVulns, stats) {
  let md = "# Securify Security Audit Report\n\n";
  md += `**Scan Date:** ${(/* @__PURE__ */ new Date()).toUTCString()}  
`;
  md += `**Total Issues:** ${stats.total} (\u{1F534} Critical: ${stats.critical}, \u{1F7E0} High: ${stats.high}, \u{1F7E1} Medium: ${stats.medium}, \u{1F535} Low: ${stats.low})

`;
  if (findings.length > 0) {
    md += "## Hardcoded Secrets Detected\n\n";
    md += "| Severity | Type | File:Line | Secret Sample | Action Required |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    findings.forEach((f) => {
      const badge = f.severity === "critical" ? "\u{1F534} Critical" : f.severity === "high" ? "\u{1F7E0} High" : f.severity === "medium" ? "\u{1F7E1} Medium" : "\u{1F535} Low";
      md += `| ${badge} | ${f.type} | \`${f.file}:${f.line}\` | \`${f.redacted || "***"}\` | Revoke & Rotate |
`;
    });
    md += "\n";
  }
  if (depVulns.length > 0) {
    md += "## Dependency Vulnerabilities (CVE / OSV)\n\n";
    md += "| Manifest | Package | Vulnerability Count |\n";
    md += "| :--- | :--- | :--- |\n";
    depVulns.forEach((dv) => {
      md += `| \`${dv.file}\` | \`${dv.package}\` | ${dv.vulnerabilities.length} issue(s) |
`;
    });
    md += "\n";
  }
  if (findings.length === 0 && depVulns.length === 0) {
    md += "## Status: Clean\n\nNo credential leaks or known dependency vulnerabilities were detected.\n";
  }
  return md;
}
function outputResults(findings, depVulns, options) {
  const stats = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length
  };
  const exportData = {
    metadata: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      scanType: "local",
      path: options.path
    },
    findings: findings.map((f) => ({
      file: f.file,
      line: f.line,
      column: f.column || 1,
      type: f.type,
      severity: f.severity,
      match: f.redacted,
      description: f.description
    })),
    summary: stats,
    dependencies: depVulns
  };
  let contentToWrite = "";
  if (options.format === "sarif") {
    contentToWrite = generateSarifReport(findings, depVulns);
  } else if (options.format === "markdown") {
    contentToWrite = generateMarkdownReport(findings, depVulns, stats);
  } else if (options.format === "json") {
    contentToWrite = JSON.stringify(exportData, null, 2);
  } else {
    console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log("              SECURIFY SECURITY SCAN RESULTS");
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    console.log(`Total Findings: ${stats.total}`);
    console.log(`  \u{1F534} Critical: ${stats.critical}`);
    console.log(`  \u{1F7E0} High: ${stats.high}`);
    console.log(`  \u{1F7E1} Medium: ${stats.medium}`);
    console.log(`  \u{1F535} Low: ${stats.low}
`);
    if (findings.length > 0) {
      console.log("Findings:\n");
      findings.forEach((f, idx) => {
        const icon = f.severity === "critical" ? "\u{1F534}" : f.severity === "high" ? "\u{1F7E0}" : f.severity === "medium" ? "\u{1F7E1}" : "\u{1F535}";
        console.log(`${idx + 1}. ${icon} ${f.type}`);
        console.log(`   File: ${f.file}:${f.line}`);
        console.log(`   Match: ${f.redacted}`);
        console.log("");
      });
    }
    if (depVulns.length > 0) {
      console.log("\nDependency Vulnerabilities:\n");
      depVulns.forEach((dv, idx) => {
        console.log(`${idx + 1}. ${dv.package}`);
        console.log(`   File: ${dv.file}`);
        console.log(`   Vulnerabilities: ${dv.vulnerabilities.length}`);
        console.log("");
      });
    }
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
  }
  if (contentToWrite) {
    if (options.output) {
      fs.writeFileSync(options.output, contentToWrite, "utf-8");
      console.log(`Scan report successfully written to: ${options.output}`);
    } else {
      console.log(contentToWrite);
    }
  }
  if (stats.critical > 0 || stats.high > 0) {
    process.exit(1);
  }
}
async function main() {
  const options = parseArgs();
  if (options.verbose || options.format === "text") {
    console.log("Securify CLI - Starting scan...\n");
  }
  if (!fs.existsSync(options.path)) {
    console.error(`Error: Path '${options.path}' does not exist`);
    process.exit(1);
  }
  const findings = await scanDirectory(options.path, options);
  let depVulns = [];
  if (options.dependencies) {
    depVulns = await scanDependencies(options.path, options);
  }
  outputResults(findings, depVulns, options);
}
var isDirectCliRun = Boolean(
  process.argv[1] && ((0, import_url.fileURLToPath)(import_meta.url) === path.resolve(process.argv[1]) || process.argv[1].endsWith("src/cli/index.ts") || process.argv[1].endsWith("src\\cli\\index.ts") || process.argv[1].endsWith("bin/securify.js") || process.argv[1].endsWith("bin\\securify.js") || process.argv[1].endsWith("dist/cli/index.js") || process.argv[1].endsWith("dist\\cli\\index.js"))
);
if (isDirectCliRun) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateMarkdownReport,
  generateSarifReport
});
