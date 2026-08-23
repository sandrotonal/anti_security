#!/usr/bin/env node

// Securify CLI - Real Security Scanner
// No mock data - production-ready tool

import { scanContent } from '../lib/scanEngine.ts';
import { parseDependencyFile } from '../lib/dependencyParser.ts';
import { batchQueryVulnerabilities } from '../lib/cveDatabase.ts';
import * as fs from 'fs';
import * as path from 'path';

interface CLIOptions {
  path?: string;
  output?: string;
  format?: 'json' | 'sarif' | 'markdown' | 'text';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  exclude?: string[];
  includeTests?: boolean;
  verbose?: boolean;
  dependencies?: boolean;
}

// Parse command line arguments
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    path: process.cwd(),
    format: 'text',
    exclude: ['node_modules', '.git', 'dist', 'build'],
    includeTests: false,
    verbose: false,
    dependencies: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      console.log('Securify CLI v1.0.0');
      process.exit(0);
    } else if (arg === '--path' || arg === '-p') {
      options.path = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--format' || arg === '-f') {
      options.format = args[++i] as any;
    } else if (arg === '--severity' || arg === '-s') {
      options.severity = args[++i] as any;
    } else if (arg === '--exclude' || arg === '-e') {
      options.exclude!.push(args[++i]);
    } else if (arg === '--include-tests') {
      options.includeTests = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--dependencies' || arg === '-d') {
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
  ✓ Real-time secret detection with 40+ patterns
  ✓ Shannon entropy analysis for high-entropy secrets
  ✓ CVE vulnerability scanning for dependencies
  ✓ Multiple export formats (JSON, SARIF, Markdown)
  ✓ GitHub Actions integration
  ✓ CI/CD pipeline support
  ✓ Zero false positives with confidence scoring
`);
}

// Native recursive directory scanner
function getFilesRecursive(dir: string, ignorePatterns: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    
    // Check if path matches any ignore patterns
    const isIgnored = ignorePatterns.some(pattern => {
      const cleanPattern = pattern
        .replace(/^\*\*\//, '')
        .replace(/\/\*\*$/, '')
        .replace(/\*/g, '');
      if (!cleanPattern) return false;
      return file === cleanPattern || filePath.includes(cleanPattern);
    });
    
    if (isIgnored) continue;
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath, ignorePatterns));
    } else {
      const ext = path.extname(file).toLowerCase();
      const isEnvFile = file.startsWith('.env');
      const validExtensions = [
        '.js', '.ts', '.jsx', '.tsx',
        '.py', '.go', '.java', '.rb', '.php',
        '.yml', '.yaml', '.json',
        '.sh', '.bash', '.conf', '.config'
      ];
      if (validExtensions.includes(ext) || isEnvFile) {
        results.push(filePath);
      }
    }
  }
  return results;
}

// Scan files in directory
async function scanDirectory(dirPath: string, options: CLIOptions): Promise<any[]> {
  const ignore = options.exclude || [];
  if (!options.includeTests) {
    ignore.push('**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**');
  }

  const files = getFilesRecursive(dirPath, ignore);

  if (options.verbose) {
    console.log(`Found ${files.length} files to scan`);
  }

  const allFindings: any[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(dirPath, file);
      const results = scanContent(content, relativePath);

      // Filter by severity if specified
      const filtered = options.severity
        ? results.filter(r => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[r.severity] <= severityOrder[options.severity!];
          })
        : results;

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

// Scan dependencies
async function scanDependencies(dirPath: string, options: CLIOptions): Promise<any[]> {
  const manifestFiles = [
    'package.json', 'requirements.txt', 'Pipfile.lock',
    'go.mod', 'Cargo.toml', 'pom.xml', 'composer.json', 'Gemfile.lock'
  ];

  const vulnerabilities: any[] = [];

  for (const manifest of manifestFiles) {
    const manifestPath = path.join(dirPath, manifest);
    
    if (!fs.existsSync(manifestPath)) continue;

    if (options.verbose) {
      console.log(`Scanning dependencies in ${manifest}...`);
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const dependencies = parseDependencyFile(manifest, content);

      if (dependencies.length === 0) continue;

      const cveResults = await batchQueryVulnerabilities(dependencies);

      for (const [pkgKey, vulns] of cveResults.entries()) {
        if (vulns.length > 0) {
          vulnerabilities.push({
            package: pkgKey,
            vulnerabilities: vulns,
            file: manifest,
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

// Generate SARIF 2.1.0 report
export function generateSarifReport(findings: any[], _depVulns: any[] = []): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Securify',
            version: '2.4.0',
            informationUri: 'https://securify.gucluyumhe.dev',
            rules: Array.from(new Set(findings.map(f => f.type))).map(type => ({
              id: type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: type,
              shortDescription: { text: `Hardcoded credential leak: ${type}` },
              help: { text: `Revoke this secret immediately and store in environment variables or a secrets manager.` },
              defaultConfiguration: {
                level: findings.find(f => f.type === type)?.severity === 'critical' || findings.find(f => f.type === type)?.severity === 'high' ? 'error' : 'warning'
              }
            }))
          }
        },
        results: findings.map(f => ({
          ruleId: f.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          level: f.severity === 'critical' || f.severity === 'high' ? 'error' : 'warning',
          message: {
            text: `Hardcoded ${f.type} credential detected (${f.redacted || '***'}).`
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: f.file.replace(/\\/g, '/')
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

// Generate Markdown table report
export function generateMarkdownReport(findings: any[], depVulns: any[], stats: { total: number; critical: number; high: number; medium: number; low: number }): string {
  let md = '# Securify Security Audit Report\n\n';
  md += `**Scan Date:** ${new Date().toUTCString()}  \n`;
  md += `**Total Issues:** ${stats.total} (🔴 Critical: ${stats.critical}, 🟠 High: ${stats.high}, 🟡 Medium: ${stats.medium}, 🔵 Low: ${stats.low})\n\n`;

  if (findings.length > 0) {
    md += '## Hardcoded Secrets Detected\n\n';
    md += '| Severity | Type | File:Line | Secret Sample | Action Required |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    findings.forEach(f => {
      const badge = f.severity === 'critical' ? '🔴 Critical' :
                    f.severity === 'high' ? '🟠 High' :
                    f.severity === 'medium' ? '🟡 Medium' : '🔵 Low';
      md += `| ${badge} | ${f.type} | \`${f.file}:${f.line}\` | \`${f.redacted || '***'}\` | Revoke & Rotate |\n`;
    });
    md += '\n';
  }

  if (depVulns.length > 0) {
    md += '## Dependency Vulnerabilities (CVE / OSV)\n\n';
    md += '| Manifest | Package | Vulnerability Count |\n';
    md += '| :--- | :--- | :--- |\n';
    depVulns.forEach(dv => {
      md += `| \`${dv.file}\` | \`${dv.package}\` | ${dv.vulnerabilities.length} issue(s) |\n`;
    });
    md += '\n';
  }

  if (findings.length === 0 && depVulns.length === 0) {
    md += '## Status: Clean\n\nNo credential leaks or known dependency vulnerabilities were detected.\n';
  }

  return md;
}

// Format and output results
function outputResults(findings: any[], depVulns: any[], options: CLIOptions) {
  const stats = {
    total: findings.length,
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  };

  const exportData = {
    metadata: {
      timestamp: new Date().toISOString(),
      scanType: 'local' as const,
      path: options.path,
    },
    findings: findings.map(f => ({
      file: f.file,
      line: f.line,
      column: f.column || 1,
      type: f.type,
      severity: f.severity,
      match: f.redacted,
      description: f.description,
    })),
    summary: stats,
    dependencies: depVulns,
  };

  let contentToWrite = '';

  if (options.format === 'sarif') {
    contentToWrite = generateSarifReport(findings, depVulns);
  } else if (options.format === 'markdown') {
    contentToWrite = generateMarkdownReport(findings, depVulns, stats);
  } else if (options.format === 'json') {
    contentToWrite = JSON.stringify(exportData, null, 2);
  } else {
    // Default: text/terminal format
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('              SECURIFY SECURITY SCAN RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total Findings: ${stats.total}`);
    console.log(`  🔴 Critical: ${stats.critical}`);
    console.log(`  🟠 High: ${stats.high}`);
    console.log(`  🟡 Medium: ${stats.medium}`);
    console.log(`  🔵 Low: ${stats.low}\n`);

    if (findings.length > 0) {
      console.log('Findings:\n');
      findings.forEach((f, idx) => {
        const icon = f.severity === 'critical' ? '🔴' :
                     f.severity === 'high' ? '🟠' :
                     f.severity === 'medium' ? '🟡' : '🔵';
        console.log(`${idx + 1}. ${icon} ${f.type}`);
        console.log(`   File: ${f.file}:${f.line}`);
        console.log(`   Match: ${f.redacted}`);
        console.log('');
      });
    }

    if (depVulns.length > 0) {
      console.log('\nDependency Vulnerabilities:\n');
      depVulns.forEach((dv, idx) => {
        console.log(`${idx + 1}. ${dv.package}`);
        console.log(`   File: ${dv.file}`);
        console.log(`   Vulnerabilities: ${dv.vulnerabilities.length}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  if (contentToWrite) {
    if (options.output) {
      fs.writeFileSync(options.output, contentToWrite, 'utf-8');
      console.log(`Scan report successfully written to: ${options.output}`);
    } else {
      console.log(contentToWrite);
    }
  }

  // Unified exit code policy across ALL formats: exit with error code if critical/high findings exist
  if (stats.critical > 0 || stats.high > 0) {
    process.exit(1);
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (options.verbose || options.format === 'text') {
    console.log('Securify CLI - Starting scan...\n');
  }

  if (!fs.existsSync(options.path!)) {
    console.error(`Error: Path '${options.path}' does not exist`);
    process.exit(1);
  }

  // Scan for secrets
  const findings = await scanDirectory(options.path!, options);

  // Scan dependencies if requested
  let depVulns: any[] = [];
  if (options.dependencies) {
    depVulns = await scanDependencies(options.path!, options);
  }

  // Output results
  outputResults(findings, depVulns, options);
}

import { fileURLToPath } from 'url';

// Run only when executed directly via CLI
const isDirectCliRun = Boolean(
  process.argv[1] && (
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('src/cli/index.ts') ||
    process.argv[1].endsWith('src\\cli\\index.ts') ||
    process.argv[1].endsWith('bin/securify.js') ||
    process.argv[1].endsWith('bin\\securify.js') ||
    process.argv[1].endsWith('dist/cli/index.js') ||
    process.argv[1].endsWith('dist\\cli\\index.js')
  )
);

if (isDirectCliRun) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
