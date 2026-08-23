// Real Secret Scanning Engine - Professional Implementation
// No mock data, no fake results - production-ready security scanner

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  category: 'cloud' | 'vcs' | 'saas' | 'database' | 'crypto' | 'generic';
  isStructured?: boolean;
  entropy?: {
    min: number;
    charset: string;
  };
  verify?: (match: string) => boolean;
}

export interface ScanResult {
  file: string;
  line: number;
  column: number;
  match: string;
  type: string;
  category?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  entropy: number;
  description: string;
  redacted: string;
}

// Shannon Entropy Calculator - Real Implementation
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  
  const frequencies = new Map<string, number>();
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

// High-entropy detection for random secrets
export function hasHighEntropy(str: string, minEntropy: number = 4.0): boolean {
  return calculateEntropy(str) >= minEntropy;
}

// Real Secret Patterns - Industry Standard
export const SECRET_PATTERNS: SecretPattern[] = [
  // AWS Secrets
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    category: 'cloud',
    isStructured: true,
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    category: 'cloud',
    isStructured: true,
    pattern: /(?:aws_secret_access_key|aws_sec_key|aws_secret|secret_access_key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
  },
  {
    id: 'aws-session-token',
    name: 'AWS Session Token',
    category: 'cloud',
    isStructured: true,
    pattern: /(?:FQoGZXIvYXdzE|AQoECAEQA)[A-Za-z0-9/+=]{100,}/g,
  },

  // Google Cloud
  {
    id: 'gcp-api-key',
    name: 'Google Cloud API Key',
    category: 'cloud',
    isStructured: true,
    pattern: /AIza[0-9A-Za-z_\-]{35}/g,
  },
  {
    id: 'gcp-service-account',
    name: 'GCP Service Account Key',
    category: 'cloud',
    isStructured: true,
    pattern: /"type":\s*"service_account"|"private_key":\s*"-----BEGIN PRIVATE KEY-----/g,
  },

  // GitHub
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    category: 'vcs',
    isStructured: true,
    pattern: /ghp_[A-Za-z0-9]{36}/g,
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Token',
    category: 'vcs',
    isStructured: true,
    pattern: /gho_[A-Za-z0-9]{36}/g,
  },
  {
    id: 'github-app-token',
    name: 'GitHub App Token',
    category: 'vcs',
    isStructured: true,
    pattern: /(?:ghu|ghs|ghr)_[A-Za-z0-9]{36}/g,
  },
  {
    id: 'github-refresh-token',
    name: 'GitHub Refresh Token',
    category: 'vcs',
    isStructured: true,
    pattern: /ghr_[A-Za-z0-9]{76}/g,
  },

  // GitLab
  {
    id: 'gitlab-pat',
    name: 'GitLab Personal Access Token',
    category: 'vcs',
    isStructured: true,
    pattern: /glpat-[A-Za-z0-9\-_]{20}/g,
  },

  // Stripe
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    category: 'saas',
    isStructured: true,
    pattern: /(?:sk_live|sk_test)_[0-9a-zA-Z]{24,99}/g,
  },
  {
    id: 'stripe-restricted-key',
    name: 'Stripe Restricted Key',
    category: 'saas',
    isStructured: true,
    pattern: /(?:rk_live|rk_test)_[0-9a-zA-Z]{24,99}/g,
  },

  // PayPal
  {
    id: 'paypal-braintree',
    name: 'PayPal Braintree Access Token',
    category: 'saas',
    isStructured: true,
    pattern: /access_token\$production\$[a-z0-9]{16}\$[a-f0-9]{32}/gi,
  },

  // Slack
  {
    id: 'slack-token',
    name: 'Slack Token',
    category: 'saas',
    isStructured: true,
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,32}/g,
  },
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    category: 'saas',
    isStructured: true,
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,12}\/B[A-Z0-9]{8,12}\/[A-Za-z0-9]{24}/g,
  },

  // Twilio
  {
    id: 'twilio-api-key',
    name: 'Twilio API Key',
    category: 'saas',
    isStructured: true,
    pattern: /SK[a-f0-9]{32}/g,
  },

  // SendGrid
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    category: 'saas',
    isStructured: true,
    pattern: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/g,
  },

  // MailChimp
  {
    id: 'mailchimp-api-key',
    name: 'MailChimp API Key',
    category: 'saas',
    isStructured: true,
    pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g,
  },

  // Mailgun
  {
    id: 'mailgun-api-key',
    name: 'Mailgun API Key',
    category: 'saas',
    isStructured: true,
    pattern: /key-[a-f0-9]{32}/g,
  },

  // Square
  {
    id: 'square-access-token',
    name: 'Square Access Token',
    category: 'saas',
    isStructured: true,
    pattern: /sq0atp-[A-Za-z0-9_\-]{22}/g,
  },
  {
    id: 'square-oauth-secret',
    name: 'Square OAuth Secret',
    category: 'saas',
    isStructured: true,
    pattern: /sq0csp-[A-Za-z0-9_\-]{43}/g,
  },

  // Heroku
  {
    id: 'heroku-api-key',
    name: 'Heroku API Key',
    category: 'saas',
    isStructured: true,
    pattern: /(?:heroku_api_key|HEROKU_API_KEY)\s*[:=]\s*['"]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})['"]?/gi,
  },

  // Private Keys
  {
    id: 'rsa-private-key',
    name: 'RSA Private Key',
    category: 'crypto',
    isStructured: true,
    pattern: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    id: 'dsa-private-key',
    name: 'DSA Private Key',
    category: 'crypto',
    isStructured: true,
    pattern: /-----BEGIN DSA PRIVATE KEY-----/g,
  },
  {
    id: 'ec-private-key',
    name: 'EC Private Key',
    category: 'crypto',
    isStructured: true,
    pattern: /-----BEGIN EC PRIVATE KEY-----/g,
  },
  {
    id: 'pgp-private-key',
    name: 'PGP Private Key',
    category: 'crypto',
    isStructured: true,
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
  },
  {
    id: 'ssh-private-key',
    name: 'SSH Private Key',
    category: 'crypto',
    isStructured: true,
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
  },

  // Database Connection Strings
  {
    id: 'postgres-connection',
    name: 'PostgreSQL Connection String',
    category: 'database',
    isStructured: true,
    pattern: /postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },
  {
    id: 'mysql-connection',
    name: 'MySQL Connection String',
    category: 'database',
    isStructured: true,
    pattern: /mysql:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },
  {
    id: 'mongodb-connection',
    name: 'MongoDB Connection String',
    category: 'database',
    isStructured: true,
    pattern: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },

  // JWT Tokens
  {
    id: 'jwt-token',
    name: 'JWT Token',
    category: 'crypto',
    isStructured: true,
    pattern: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
  },

  // Generic Patterns with Entropy Filtering
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    category: 'generic',
    isStructured: false,
    pattern: /(?:api[_-]?key|apikey|access[_-]?key)\s*[:=]\s*['"]([A-Za-z0-9_\-]{20,})['"]/gi,
    entropy: { min: 3.2, charset: 'A-Za-z0-9_-' },
  },
  {
    id: 'generic-secret',
    name: 'Generic Secret Key',
    category: 'generic',
    isStructured: false,
    pattern: /(?:secret|password|passwd|auth_token)\s*[:=]\s*['"]([A-Za-z0-9_\-@#$%^&*+=]{16,})['"]/gi,
    entropy: { min: 3.2, charset: 'A-Za-z0-9_-@#$%^&*+=' },
  },
];

// Redact sensitive information
export function redactSecret(secret: string): string {
  if (!secret) return '***';
  if (secret.length <= 8) {
    return '***';
  }
  const visibleChars = Math.min(4, Math.floor(secret.length * 0.15));
  return secret.substring(0, visibleChars) + '...' + secret.substring(secret.length - visibleChars);
}

// Main scanning function
export function scanContent(content: string, filename: string = 'unknown'): ScanResult[] {
  if (!content) return [];
  const results: ScanResult[] = [];
  const lines = content.split('\n');

  for (const pattern of SECRET_PATTERNS) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // Support inline comment suppression: // securify:ignore or /* securify:ignore */
      if (line.includes('securify:ignore') || line.includes('securify-ignore')) {
        continue;
      }

      pattern.pattern.lastIndex = 0; // Reset regex state
      
      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(line)) !== null) {
        // If capture group exists, use capture group; otherwise use full match
        const matchedText = match[1] || match[0];
        const matchEntropy = calculateEntropy(matchedText);
        
        // For generic unstructured patterns, apply entropy check to reduce false positives
        if (!pattern.isStructured && pattern.entropy) {
          if (matchEntropy < pattern.entropy.min) {
            continue;
          }
        }

        // Apply custom verification if specified
        if (pattern.verify && !pattern.verify(matchedText)) {
          continue;
        }

        const confidence: 'high' | 'medium' | 'low' = pattern.isStructured 
          ? 'high' 
          : matchEntropy >= 3.8 ? 'medium' : 'low';

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
          redacted: redactSecret(matchedText),
        });
      }
    }
  }

  // Deduplicate overlapping findings on the same line: prefer specific/structured patterns over generic ones
  const deduplicated: ScanResult[] = [];
  for (const res of results) {
    const existing = deduplicated.find(d => 
      d.line === res.line && (d.match.includes(res.match) || res.match.includes(d.match))
    );
    if (existing) {
      // If current is structured/specific and existing is generic, replace existing
      if (res.confidence === 'high' && existing.confidence !== 'high') {
        const idx = deduplicated.indexOf(existing);
        deduplicated[idx] = res;
      }
      // Otherwise ignore redundant lower-confidence generic match
    } else {
      deduplicated.push(res);
    }
  }

  return deduplicated;
}

function determineSeverity(patternId: string): 'critical' | 'high' | 'medium' | 'low' {
  const critical = [
    'aws-secret-key',
    'rsa-private-key',
    'ssh-private-key',
    'dsa-private-key',
    'ec-private-key',
    'pgp-private-key',
    'gcp-service-account'
  ];
  const high = [
    'aws-access-key',
    'github-pat',
    'gitlab-pat',
    'stripe-secret-key',
    'stripe-restricted-key',
    'postgres-connection',
    'mysql-connection',
    'mongodb-connection'
  ];
  const medium = [
    'gcp-api-key',
    'slack-token',
    'slack-webhook',
    'sendgrid-api-key',
    'twilio-api-key',
    'jwt-token',
    'generic-api-key'
  ];
  
  if (critical.includes(patternId)) return 'critical';
  if (high.includes(patternId)) return 'high';
  if (medium.includes(patternId)) return 'medium';
  return 'low';
}
