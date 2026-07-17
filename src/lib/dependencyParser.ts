// Real Dependency Parser - No Mock Data
// Parses manifest files and extracts real dependencies

import { PackageVersion } from './cveDatabase';

export interface ParsedDependency {
  name: string;
  version: string;
  isDirect: boolean;
  isDevDependency: boolean;
}

export interface DependencyTree {
  direct: ParsedDependency[];
  transitive: ParsedDependency[];
  devDependencies: ParsedDependency[];
}

// Parse package.json (npm/yarn/pnpm)
export function parsePackageJson(content: string): PackageVersion[] {
  try {
    const pkg = JSON.parse(content);
    const packages: PackageVersion[] = [];

    // Parse dependencies
    if (pkg.dependencies) {
      for (const [name, versionRange] of Object.entries(pkg.dependencies)) {
        const version = cleanVersion(versionRange as string);
        if (version) {
          packages.push({ name, version, ecosystem: 'npm' });
        }
      }
    }

    // Parse devDependencies
    if (pkg.devDependencies) {
      for (const [name, versionRange] of Object.entries(pkg.devDependencies)) {
        const version = cleanVersion(versionRange as string);
        if (version) {
          packages.push({ name, version, ecosystem: 'npm' });
        }
      }
    }

    return packages;
  } catch (error) {
    console.error('Failed to parse package.json:', error);
    return [];
  }
}

// Parse requirements.txt (Python pip)
export function parseRequirementsTxt(content: string): PackageVersion[] {
  const packages: PackageVersion[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle formats: package==1.2.3, package>=1.2.3, package~=1.2.3
    const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*([=~><]+)\s*([0-9\.]+)/);
    if (match) {
      packages.push({
        name: match[1],
        version: match[3],
        ecosystem: 'PyPI',
      });
    }
  }

  return packages;
}

// Parse Pipfile.lock (Python pipenv)
export function parsePipfileLock(content: string): PackageVersion[] {
  try {
    const lockfile = JSON.parse(content);
    const packages: PackageVersion[] = [];

    // Parse default dependencies
    if (lockfile.default) {
      for (const [name, info] of Object.entries(lockfile.default)) {
        const pkgInfo = info as any;
        if (pkgInfo.version) {
          packages.push({
            name,
            version: cleanVersion(pkgInfo.version),
            ecosystem: 'PyPI',
          });
        }
      }
    }

    // Parse develop dependencies
    if (lockfile.develop) {
      for (const [name, info] of Object.entries(lockfile.develop)) {
        const pkgInfo = info as any;
        if (pkgInfo.version) {
          packages.push({
            name,
            version: cleanVersion(pkgInfo.version),
            ecosystem: 'PyPI',
          });
        }
      }
    }

    return packages;
  } catch (error) {
    console.error('Failed to parse Pipfile.lock:', error);
    return [];
  }
}

// Parse go.mod (Go modules)
export function parseGoMod(content: string): PackageVersion[] {
  const packages: PackageVersion[] = [];
  const lines = content.split('\n');
  let inRequireBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('require (')) {
      inRequireBlock = true;
      continue;
    }

    if (trimmed === ')' && inRequireBlock) {
      inRequireBlock = false;
      continue;
    }

    if (trimmed.startsWith('require ') || inRequireBlock) {
      const match = trimmed.match(/([^\s]+)\s+v?([0-9]+\.[0-9]+\.[0-9]+[^\s]*)/);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
          ecosystem: 'Go',
        });
      }
    }
  }

  return packages;
}

// Parse Cargo.toml (Rust)
export function parseCargoToml(content: string): PackageVersion[] {
  const packages: PackageVersion[] = [];
  const lines = content.split('\n');
  let inDependenciesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '[dependencies]') {
      inDependenciesSection = true;
      continue;
    }

    if (trimmed.startsWith('[') && trimmed !== '[dependencies]') {
      inDependenciesSection = false;
      continue;
    }

    if (inDependenciesSection && trimmed) {
      // Format: package = "version" or package = { version = "version" }
      const simpleMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*"([^"]+)"/);
      if (simpleMatch) {
        packages.push({
          name: simpleMatch[1],
          version: simpleMatch[2],
          ecosystem: 'crates.io',
        });
        continue;
      }

      const complexMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
      if (complexMatch) {
        packages.push({
          name: complexMatch[1],
          version: complexMatch[2],
          ecosystem: 'crates.io',
        });
      }
    }
  }

  return packages;
}

// Parse pom.xml (Maven)
export function parsePomXml(content: string): PackageVersion[] {
  const packages: PackageVersion[] = [];
  
  // Simple XML parsing for dependencies
  const dependencyRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/g;
  
  let match;
  while ((match = dependencyRegex.exec(content)) !== null) {
    const groupId = match[1].trim();
    const artifactId = match[2].trim();
    const version = match[3].trim();
    
    packages.push({
      name: `${groupId}:${artifactId}`,
      version: cleanVersion(version),
      ecosystem: 'Maven',
    });
  }

  return packages;
}

// Parse composer.json (PHP)
export function parseComposerJson(content: string): PackageVersion[] {
  try {
    const composer = JSON.parse(content);
    const packages: PackageVersion[] = [];

    if (composer.require) {
      for (const [name, versionRange] of Object.entries(composer.require)) {
        if (name === 'php') continue; // Skip PHP version itself
        const version = cleanVersion(versionRange as string);
        if (version) {
          packages.push({ name, version, ecosystem: 'Composer' });
        }
      }
    }

    if (composer['require-dev']) {
      for (const [name, versionRange] of Object.entries(composer['require-dev'])) {
        const version = cleanVersion(versionRange as string);
        if (version) {
          packages.push({ name, version, ecosystem: 'Composer' });
        }
      }
    }

    return packages;
  } catch (error) {
    console.error('Failed to parse composer.json:', error);
    return [];
  }
}

// Parse Gemfile.lock (Ruby)
export function parseGemfileLock(content: string): PackageVersion[] {
  const packages: PackageVersion[] = [];
  const lines = content.split('\n');
  let inSpecsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'specs:') {
      inSpecsSection = true;
      continue;
    }

    if (inSpecsSection && line.startsWith('  ') && !line.startsWith('    ')) {
      const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s+\(([0-9\.]+)\)/);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
          ecosystem: 'RubyGems',
        });
      }
    }

    if (trimmed === '' && inSpecsSection) {
      inSpecsSection = false;
    }
  }

  return packages;
}

// Auto-detect and parse dependency file
export function parseDependencyFile(filename: string, content: string): PackageVersion[] {
  const lower = filename.toLowerCase();

  if (lower === 'package.json') return parsePackageJson(content);
  if (lower === 'requirements.txt') return parseRequirementsTxt(content);
  if (lower === 'pipfile.lock') return parsePipfileLock(content);
  if (lower === 'go.mod') return parseGoMod(content);
  if (lower === 'cargo.toml') return parseCargoToml(content);
  if (lower === 'pom.xml') return parsePomXml(content);
  if (lower === 'composer.json') return parseComposerJson(content);
  if (lower === 'gemfile.lock') return parseGemfileLock(content);

  return [];
}

// Clean version string (remove operators like ^, ~, >=)
function cleanVersion(versionRange: string): string {
  return versionRange.replace(/^[^0-9]*/, '').split(/[\s,]/)[0] || '0.0.0';
}
