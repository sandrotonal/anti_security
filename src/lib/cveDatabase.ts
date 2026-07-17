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
      throw new Error(`OSV API error: ${response.status}`);
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
      throw new Error(`GitHub Advisory API error: ${response.status}`);
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

  return data.vulns.map((vuln: any) => ({
    id: vuln.id || 'UNKNOWN',
    packageName: pkg.name,
    ecosystem: pkg.ecosystem,
    affectedVersions: extractAffectedVersions(vuln.affected),
    fixedVersion: extractFixedVersion(vuln.affected),
    severity: mapSeverity(vuln.database_specific?.severity || vuln.severity),
    cvss: vuln.database_specific?.cvss_score,
    description: vuln.summary || vuln.details || 'No description available',
    references: (vuln.references || []).map((ref: any) => ref.url).filter(Boolean),
    publishedDate: vuln.published || new Date().toISOString(),
    lastModified: vuln.modified || vuln.published || new Date().toISOString(),
  }));
}

// Parse GitHub Advisory response
function parseGitHubAdvisories(data: any, pkg: PackageVersion): CVEVulnerability[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((advisory: any) => {
      // Check if this package version is affected
      const vulnerable = advisory.vulnerabilities?.some(
        (v: any) => v.package?.name === pkg.name && isVersionAffected(pkg.version, v.vulnerable_version_range)
      );
      return vulnerable;
    })
    .map((advisory: any) => ({
      id: advisory.ghsa_id || advisory.cve_id || 'UNKNOWN',
      packageName: pkg.name,
      ecosystem: pkg.ecosystem,
      affectedVersions: extractGHAffectedVersions(advisory.vulnerabilities),
      fixedVersion: extractGHFixedVersion(advisory.vulnerabilities),
      severity: advisory.severity?.toUpperCase() || 'MODERATE',
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

function mapSeverity(severity: string): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  const upper = (severity || '').toUpperCase();
  if (upper.includes('CRITICAL')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('LOW')) return 'LOW';
  return 'MODERATE';
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

function isVersionAffected(version: string, range: string): boolean {
  // Simplified version check - in production use semver library
  if (!range) return false;
  // This is a placeholder - real implementation needs semver comparison
  return true;
}

function mergeVulnerabilities(vulns: CVEVulnerability[]): CVEVulnerability[] {
  const seen = new Set<string>();
  return vulns.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}
