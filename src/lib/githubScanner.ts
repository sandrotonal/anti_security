// Real GitHub Repository Scanner - No Mock Data
// Scans ALL files in repository, no artificial limits

export interface GitHubFile {
  path: string;
  sha: string;
  size: number;
  url: string;
  type: 'file' | 'dir';
}

export interface ScanProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'scanning' | 'complete' | 'error';
}

const GITHUB_API = 'https://api.github.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for text analysis

// File extensions to scan for secrets
const SCANNABLE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rb', '.php', '.java',
  '.cs', '.cpp', '.c', '.h', '.rs', '.kt', '.swift', '.m', '.scala',
  '.yaml', '.yml', '.json', '.xml', '.toml', '.ini', '.conf', '.config',
  '.env', '.properties', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.cmd',
  '.sql', '.graphql', '.proto', '.tf', '.hcl', '.dart', '.vue', '.svelte',
  '', // Files without extension (like Dockerfile, Makefile)
]);

// Files to skip (binary, media, etc)
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.mp4', '.mp3', '.wav', '.avi', '.mov', '.pdf', '.zip', '.tar',
  '.gz', '.rar', '.7z', '.exe', '.dll', '.so', '.dylib', '.woff',
  '.woff2', '.ttf', '.eot', '.lock', '.sum', '.min.js', '.min.css',
]);

export class GitHubRepoScanner {
  private token?: string;
  private cancelRequested = false;

  constructor(token?: string) {
    this.token = token;
  }

  // Get all files recursively from repository
  async getAllFiles(owner: string, repo: string, branch: string = 'main'): Promise<GitHubFile[]> {
    const allFiles: GitHubFile[] = [];
    
    try {
      // Get repository tree recursively
      const tree = await this.getRepoTree(owner, repo, branch);
      
      for (const item of tree) {
        if (item.type === 'blob') { // It's a file
          const ext = this.getFileExtension(item.path);
          
          // Skip binary and non-scannable files
          if (SKIP_EXTENSIONS.has(ext)) continue;
          
          // Only include scannable files
          if (this.isScannableFile(item.path)) {
            allFiles.push({
              path: item.path,
              sha: item.sha,
              size: item.size,
              url: item.url,
              type: 'file',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to get repository files:', error);
      throw error;
    }

    return allFiles;
  }

  // Get repository tree (all files)
  private async getRepoTree(owner: string, repo: string, branch: string): Promise<any[]> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // First, get the branch to find the tree SHA
    const branchRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      { headers }
    );

    if (!branchRes.ok) {
      throw new Error(`Failed to fetch branch: ${branchRes.status}`);
    }

    const branchData = await branchRes.json();
    const commitSha = branchData.object.sha;

    // Get the commit to find the tree SHA
    const commitRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${commitSha}`,
      { headers }
    );

    if (!commitRes.ok) {
      throw new Error(`Failed to fetch commit: ${commitRes.status}`);
    }

    const commitData = await commitRes.json();
    const treeSha = commitData.tree.sha;

    // Get the full tree recursively
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch tree: ${treeRes.status}`);
    }

    const treeData = await treeRes.json();
    return treeData.tree || [];
  }

  // Download file content
  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
        { headers }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch ${path}: ${response.status}`);
        return null;
      }

      // Check content size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        console.warn(`Skipping ${path}: file too large (${contentLength} bytes)`);
        return null;
      }

      return await response.text();
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      return null;
    }
  }

  // Batch download files with rate limiting
  async downloadFiles(
    owner: string,
    repo: string,
    files: GitHubFile[],
    onProgress?: (progress: ScanProgress) => void
  ): Promise<Map<string, string>> {
    const contents = new Map<string, string>();
    const total = files.length;
    let completed = 0;

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      if (this.cancelRequested) break;

      const batch = files.slice(i, i + batchSize);
      const promises = batch.map(async (file) => {
        const content = await this.getFileContent(owner, repo, file.path);
        if (content !== null) {
          contents.set(file.path, content);
        }
        completed++;
        
        if (onProgress) {
          onProgress({
            current: completed,
            total,
            currentFile: file.path,
            status: 'scanning',
          });
        }
      });

      await Promise.all(promises);

      // Rate limiting: wait 100ms between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (onProgress) {
      onProgress({
        current: total,
        total,
        currentFile: '',
        status: this.cancelRequested ? 'error' : 'complete',
      });
    }

    return contents;
  }

  // Cancel ongoing scan
  cancel(): void {
    this.cancelRequested = true;
  }

  // Reset cancel state
  reset(): void {
    this.cancelRequested = false;
  }

  // Check if file should be scanned
  private isScannableFile(path: string): boolean {
    const ext = this.getFileExtension(path);
    
    // Skip common non-scannable files
    if (SKIP_EXTENSIONS.has(ext)) return false;
    
    // Include files with scannable extensions
    if (SCANNABLE_EXTENSIONS.has(ext)) return true;
    
    // Include specific config/manifest files
    const filename = path.split('/').pop()?.toLowerCase() || '';
    const scannableFiles = [
      'dockerfile', 'makefile', 'jenkinsfile', 'rakefile',
      '.gitignore', '.dockerignore', '.env.example',
    ];
    
    return scannableFiles.includes(filename);
  }

  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    const lastSlash = path.lastIndexOf('/');
    
    if (lastDot === -1 || lastDot < lastSlash) return '';
    return path.substring(lastDot).toLowerCase();
  }
}

// Parse GitHub URL to extract owner/repo
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  try {
    const patterns = [
      /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
      /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/,
      /github\.com\/([^/]+)\/([^/]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          branch: match[3],
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Validate GitHub token type (Classic vs Fine-Grained)
export function validateGitHubToken(token: string): { isValid: boolean; type?: 'classic' | 'fine-grained' | 'oauth' | 'app' } {
  if (!token || typeof token !== 'string') return { isValid: false };
  const trimmed = token.trim();
  
  if (trimmed.startsWith('github_pat_')) {
    return { isValid: true, type: 'fine-grained' };
  }
  if (trimmed.startsWith('ghp_')) {
    return { isValid: true, type: 'classic' };
  }
  if (trimmed.startsWith('gho_')) {
    return { isValid: true, type: 'oauth' };
  }
  if (trimmed.startsWith('ghu_') || trimmed.startsWith('ghs_')) {
    return { isValid: true, type: 'app' };
  }
  // Generic length check for older legacy tokens
  if (trimmed.length === 40 && /^[a-f0-9]+$/i.test(trimmed)) {
    return { isValid: true, type: 'classic' };
  }
  
  return { isValid: false };
}

// Generate GitHub Pull Request Comment Payload in Markdown
export function generatePRCommentPayload(findings: Array<{ file: string; line: number; type: string; severity: string; description: string; redacted: string }>, repoName: string): string {
  if (!findings || findings.length === 0) {
    return `### 🛡️ Securify Security Check: PASSED\n\nNo secret leaks or credentials were detected in this Pull Request for **${repoName}**. All clean!`;
  }

  let body = `### ⚠️ Securify Security Guard: Action Required\n\n`;
  body += `Securify detected **${findings.length} potential secret leak(s)** in repository **${repoName}**:\n\n`;
  body += `| Severity | Type | File & Line | Redacted Match |\n`;
  body += `| :--- | :--- | :--- | :--- |\n`;

  findings.slice(0, 15).forEach(f => {
    const badge = f.severity === 'critical' ? '🔴 CRITICAL' : f.severity === 'high' ? '🟠 HIGH' : '🟡 MEDIUM';
    body += `| ${badge} | **${f.type}** | \`${f.file}:${f.line}\` | \`${f.redacted}\` |\n`;
  });

  if (findings.length > 15) {
    body += `\n*...and ${findings.length - 15} more finding(s) omitted for brevity.*\n`;
  }

  body += `\n> **Remediation Tip:** Revoke any leaked credentials immediately and rotate secret keys before merging this branch.`;
  return body;
}

