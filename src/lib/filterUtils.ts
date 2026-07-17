// Filtering and Search Utilities
// Browser-based filtering, no backend required

export interface Finding {
  file: string;
  line: number;
  column?: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  match: string;
  description: string;
  codeMatch?: string;
  contextLines?: Array<{ lineNum: number; content: string }>;
}

export interface FilterOptions {
  severity?: ('critical' | 'high' | 'medium' | 'low')[];
  searchTerm?: string;
  filePattern?: string;
  excludeIgnored?: boolean;
}

// Filter findings by multiple criteria
export function filterFindings(findings: Finding[], options: FilterOptions): Finding[] {
  let filtered = [...findings];

  // Filter by severity
  if (options.severity && options.severity.length > 0) {
    filtered = filtered.filter(f => options.severity!.includes(f.severity));
  }

  // Filter by search term (searches in type, file, description, match)
  if (options.searchTerm && options.searchTerm.trim()) {
    const searchLower = options.searchTerm.toLowerCase();
    filtered = filtered.filter(f =>
      f.type.toLowerCase().includes(searchLower) ||
      f.file.toLowerCase().includes(searchLower) ||
      f.description.toLowerCase().includes(searchLower) ||
      f.match.toLowerCase().includes(searchLower)
    );
  }

  // Filter by file pattern (glob-like)
  if (options.filePattern && options.filePattern.trim()) {
    const pattern = options.filePattern.toLowerCase();
    filtered = filtered.filter(f => {
      const file = f.file.toLowerCase();
      // Simple glob: * matches anything
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(file);
    });
  }

  return filtered;
}

// Group findings by file
export function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  
  findings.forEach(f => {
    const existing = groups.get(f.file) || [];
    existing.push(f);
    groups.set(f.file, existing);
  });

  return groups;
}

// Group findings by severity
export function groupBySeverity(findings: Finding[]): Record<string, Finding[]> {
  return {
    critical: findings.filter(f => f.severity === 'critical'),
    high: findings.filter(f => f.severity === 'high'),
    medium: findings.filter(f => f.severity === 'medium'),
    low: findings.filter(f => f.severity === 'low'),
  };
}

// Group findings by type
export function groupByType(findings: Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  
  findings.forEach(f => {
    const existing = groups.get(f.type) || [];
    existing.push(f);
    groups.set(f.type, existing);
  });

  return groups;
}

// Sort findings
export type SortField = 'severity' | 'file' | 'line' | 'type';
export type SortOrder = 'asc' | 'desc';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortFindings(
  findings: Finding[],
  field: SortField,
  order: SortOrder = 'asc'
): Finding[] {
  const sorted = [...findings].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'severity':
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'file':
        comparison = a.file.localeCompare(b.file);
        break;
      case 'line':
        comparison = a.line - b.line;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// Calculate statistics
export function calculateStats(findings: Finding[]) {
  const grouped = groupBySeverity(findings);
  const fileCount = new Set(findings.map(f => f.file)).size;
  const typeCount = new Set(findings.map(f => f.type)).size;

  return {
    total: findings.length,
    critical: grouped.critical.length,
    high: grouped.high.length,
    medium: grouped.medium.length,
    low: grouped.low.length,
    filesAffected: fileCount,
    uniqueTypes: typeCount,
  };
}

// Generate file heatmap data (files with most findings)
export function generateFileHeatmap(findings: Finding[], topN: number = 10) {
  const fileGroups = groupByFile(findings);
  const heatmap = Array.from(fileGroups.entries())
    .map(([file, findings]) => ({
      file,
      count: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return heatmap;
}

// Search with regex
export function searchWithRegex(findings: Finding[], pattern: string): Finding[] {
  try {
    const regex = new RegExp(pattern, 'i');
    return findings.filter(f =>
      regex.test(f.type) ||
      regex.test(f.file) ||
      regex.test(f.description) ||
      regex.test(f.match)
    );
  } catch (e) {
    // Invalid regex, return empty
    return [];
  }
}

// Get findings summary text
export function getSummaryText(findings: Finding[]): string {
  const stats = calculateStats(findings);
  return `${stats.total} findings: ${stats.critical} critical, ${stats.high} high, ${stats.medium} medium, ${stats.low} low across ${stats.filesAffected} files`;
}
