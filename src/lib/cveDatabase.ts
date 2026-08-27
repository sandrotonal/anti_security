// Real CVE Database Integration - No Mock Data
// Professional vulnerability database with multiple sources

export interface CVEVulnerability {
  id: string;
  packageName: string;
  ecosystem: string;
  affectedVersions: string[];
  fixedVersion?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  cvss?: number;
  description: string;
  references: string[];
  publishedDate: string;
  lastModified: string;
}

export interface PackageVersion {
  name: string;
  version: string;
  ecosystem: 'npm' | 'PyPI' | 'Go' | 'Maven' | 'crates.io' | 'NuGet' | 'Composer' | 'RubyGems';
}

// OSV.dev API Integration
export async function queryOSVDatabase(pkg: PackageVersion): Promise<CVEVulnerability[]> {
  try {
    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: {
          name: pkg.name,
          ecosystem: mapEcosystem(pkg.ecosystem),
        },
        version: pkg.version,
      }),
    });

    if (!response.ok) {
      console.warn(`OSV API HTTP ${response.status} for ${pkg.name}@${pkg.version}`);
      return [];
    }

    const data = await response.json();
    return parseOSVResponse(data, pkg);
  } catch (error) {
    console.error('OSV query failed:', error);
    return [];
  }
}

// GitHub Advisory Database Integration
export async function queryGitHubAdvisory(pkg: PackageVersion): Promise<CVEVulnerability[]> {
  const ecosystem = mapGitHubEcosystem(pkg.ecosystem);
  if (!ecosystem) return [];

  try {
    const response = await fetch(
      `https://api.github.com/advisories?ecosystem=${ecosystem}&affects=${encodeURIComponent(pkg.name)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      console.warn(`GitHub Advisory API HTTP ${response.status} for ${pkg.name}`);
      return [];
    }

    const data = await response.json();
    return parseGitHubAdvisories(data, pkg);
  } catch (error) {
    console.error('GitHub Advisory query failed:', error);
    return [];
  }
}

// Batch query multiple packages
export async function batchQueryVulnerabilities(packages: PackageVersion[]): Promise<Map<string, CVEVulnerability[]>> {
  const results = new Map<string, CVEVulnerability[]>();

  // Query in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    const promises = batch.map(async (pkg) => {
      const key = `${pkg.name}@${pkg.version}`;
      const osvResults = await queryOSVDatabase(pkg);
      const ghResults = await queryGitHubAdvisory(pkg);
      
      // Merge and deduplicate
      const merged = mergeVulnerabilities([...osvResults, ...ghResults]);
      results.set(key, merged);
    });

    await Promise.all(promises);
  }

  return results;
}

// Parse OSV response
function parseOSVResponse(data: any, pkg: PackageVersion): CVEVulnerability[] {
  if (!data.vulns || !Array.isArray(data.vulns)) {
    return [];
  }

  return data.vulns.map((vuln: any) => {
    const { severity, cvss } = extractSeverityAndCvss(vuln);
    return {
      id: vuln.id || 'UNKNOWN',
      packageName: pkg.name,
      ecosystem: pkg.ecosystem,
      affectedVersions: extractAffectedVersions(vuln.affected),
      fixedVersion: extractFixedVersion(vuln.affected),
      severity,
      cvss,
      description: vuln.summary || vuln.details || 'No description available',
      references: (vuln.references || []).map((ref: any) => ref.url).filter(Boolean),
      publishedDate: vuln.published || new Date().toISOString(),
      lastModified: vuln.modified || vuln.published || new Date().toISOString(),
    };
  });
}

// Parse GitHub Advisory response
function parseGitHubAdvisories(data: any, pkg: PackageVersion): CVEVulnerability[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((advisory: any) => {
      // Check if this package version is affected using real semver
      const vulnerable = advisory.vulnerabilities?.some(
        (v: any) => v.package?.name?.toLowerCase() === pkg.name.toLowerCase() && isVersionAffected(pkg.version, v.vulnerable_version_range)
      );
      return vulnerable;
    })
    .map((advisory: any) => ({
      id: advisory.ghsa_id || advisory.cve_id || 'UNKNOWN',
      packageName: pkg.name,
      ecosystem: pkg.ecosystem,
      affectedVersions: extractGHAffectedVersions(advisory.vulnerabilities),
      fixedVersion: extractGHFixedVersion(advisory.vulnerabilities),
      severity: mapSeverityString(advisory.severity),
      cvss: advisory.cvss?.score,
      description: advisory.summary || 'No description available',
      references: [advisory.html_url, ...(advisory.references || []).map((r: any) => r.url)].filter(Boolean),
      publishedDate: advisory.published_at,
      lastModified: advisory.updated_at,
    }));
}

// Helper functions
function mapEcosystem(ecosystem: string): string {
  const mapping: Record<string, string> = {
    npm: 'npm',
    PyPI: 'PyPI',
    Go: 'Go',
    Maven: 'Maven',
    'crates.io': 'crates.io',
    NuGet: 'NuGet',
    Composer: 'Packagist',
    RubyGems: 'RubyGems',
  };
  return mapping[ecosystem] || ecosystem;
}

function mapGitHubEcosystem(ecosystem: string): string | null {
  const mapping: Record<string, string> = {
    npm: 'npm',
    PyPI: 'pip',
    Go: 'go',
    Maven: 'maven',
    'crates.io': 'rust',
    NuGet: 'nuget',
    Composer: 'composer',
    RubyGems: 'rubygems',
  };
  return mapping[ecosystem] || null;
}

function mapSeverityString(severity: string | undefined): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  const upper = (severity || '').toUpperCase();
  if (upper.includes('CRITICAL')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('LOW')) return 'LOW';
  return 'MODERATE';
}

function extractSeverityAndCvss(vuln: any): { severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'; cvss?: number } {
  // Check database_specific
  if (vuln.database_specific) {
    if (typeof vuln.database_specific.severity === 'string') {
      return { severity: mapSeverityString(vuln.database_specific.severity), cvss: vuln.database_specific.cvss_score };
    }
  }

  // Check vuln.severity (can be string or array of { type: string, score: string })
  if (typeof vuln.severity === 'string') {
    return { severity: mapSeverityString(vuln.severity) };
  }

  if (Array.isArray(vuln.severity) && vuln.severity.length > 0) {
    const cvssObj = vuln.severity.find((s: any) => s && s.type && s.type.includes('CVSS'));
    if (cvssObj && cvssObj.score) {
      // Score could be CVSS vector string "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" or numeric score
      const numMatch = cvssObj.score.match(/(\d+\.\d+)/);
      if (numMatch) {
        const score = parseFloat(numMatch[1]);
        if (score >= 9.0) return { severity: 'CRITICAL', cvss: score };
        if (score >= 7.0) return { severity: 'HIGH', cvss: score };
        if (score >= 4.0) return { severity: 'MODERATE', cvss: score };
        return { severity: 'LOW', cvss: score };
      }
    }
  }

  return { severity: 'MODERATE' };
}

function extractAffectedVersions(affected: any[]): string[] {
  if (!affected) return [];
  return affected
    .flatMap((a: any) => a.ranges || [])
    .flatMap((r: any) => r.events || [])
    .filter((e: any) => e.introduced)
    .map((e: any) => e.introduced);
}

function extractFixedVersion(affected: any[]): string | undefined {
  if (!affected) return undefined;
  const fixed = affected
    .flatMap((a: any) => a.ranges || [])
    .flatMap((r: any) => r.events || [])
    .find((e: any) => e.fixed);
  return fixed?.fixed;
}

function extractGHAffectedVersions(vulnerabilities: any[]): string[] {
  if (!vulnerabilities) return [];
  return vulnerabilities.map((v: any) => v.vulnerable_version_range).filter(Boolean);
}

function extractGHFixedVersion(vulnerabilities: any[]): string | undefined {
  if (!vulnerabilities) return undefined;
  return vulnerabilities.find((v: any) => v.patched_versions)?.patched_versions;
}

// ----------------------------------------------------
// Real Semver Parser & Range Comparator
// ----------------------------------------------------

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export function parseSemver(v: string): ParsedSemver | null {
  if (!v) return null;
  const cleaned = v.trim().replace(/^[v=^~><\s]+/, '');
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== undefined ? parseInt(match[2], 10) : 0,
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0,
    prerelease: match[4]
  };
}

export function compareSemver(v1: string, v2: string): number {
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

function satisfiesSingleComparator(version: string, comparatorStr: string): boolean {
  const comp = comparatorStr.trim();
  if (!comp || comp === '*') return true;

  const match = comp.match(/^([<>=!~^]*)\s*(.+)$/);
  if (!match) return true;

  const op = match[1] || '=';
  const targetVer = match[2];

  const diff = compareSemver(version, targetVer);

  switch (op) {
    case '<': return diff < 0;
    case '<=': return diff <= 0;
    case '>': return diff > 0;
    case '>=': return diff >= 0;
    case '=':
    case '==': return diff === 0;
    case '!=': return diff !== 0;
    case '^': {
      const parsedTarget = parseSemver(targetVer);
      const parsedVer = parseSemver(version);
      if (!parsedTarget || !parsedVer) return false;
      if (diff < 0) return false;
      if (parsedTarget.major > 0) return parsedVer.major === parsedTarget.major;
      if (parsedTarget.minor > 0) return parsedVer.minor === parsedTarget.minor;
      return parsedVer.patch === parsedTarget.patch;
    }
    case '~': {
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

export function isVersionAffected(version: string, range: string): boolean {
  if (!version || !range) return false;

  // Handle || OR groups (e.g. "< 4.17.21 || >= 5.0.0 < 5.1.2")
  const orGroups = range.split(/\s*\|\|\s*/);
  
  return orGroups.some((group) => {
    // Handle comma or space separated AND conditions (e.g. ">= 1.0.0, < 2.0.0" or ">=1.0.0 <2.0.0")
    const andComparators = group
      .replace(/,/g, ' ')
      .trim()
      .split(/\s+(?=[<>=!~^])/)
      .map(c => c.trim())
      .filter(Boolean);

    if (andComparators.length === 0) return true;

    return andComparators.every(comp => satisfiesSingleComparator(version, comp));
  });
}

function mergeVulnerabilities(vulns: CVEVulnerability[]): CVEVulnerability[] {
  const seen = new Set<string>();
  return vulns.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}
