// Real Secret Scanning Engine - Professional Implementation
// No mock data, no fake results - production-ready security scanner

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
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
  severity: 'critical' | 'high' | 'medium' | 'low';
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
  
  return entropy;
}

// High-entropy detection for random secrets
export function hasHighEntropy(str: string, minEntropy: number = 4.5): boolean {
  return calculateEntropy(str) >= minEntropy;
}

// Real Secret Patterns - Industry Standard
export const SECRET_PATTERNS: SecretPattern[] = [
  // AWS Secrets
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    entropy: { min: 3.5, charset: 'A-Z0-9' },
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|aws.{0,20}secret).{0,20}['\"]([A-Za-z0-9/+=]{40})['\"]/gi,
    entropy: { min: 5.0, charset: 'A-Za-z0-9/+=' },
  },
  {
    id: 'aws-session-token',
    name: 'AWS Session Token',
    pattern: /(?:FQoGZXIvYXdzE|AQoECAEQA)[A-Za-z0-9/+=]{100,}/g,
    entropy: { min: 5.5, charset: 'A-Za-z0-9/+=' },
  },

  // Google Cloud
  {
    id: 'gcp-api-key',
    name: 'Google Cloud API Key',
    pattern: /AIza[0-9A-Za-z_\-]{35}/g,
    entropy: { min: 4.0, charset: 'A-Za-z0-9_-' },
  },
  {
    id: 'gcp-service-account',
    name: 'GCP Service Account Key',
    pattern: /"type":\s*"service_account"|"private_key":\s*"-----BEGIN PRIVATE KEY-----/g,
  },

  // GitHub
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Token',
    pattern: /gho_[A-Za-z0-9]{36}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },
  {
    id: 'github-app-token',
    name: 'GitHub App Token',
    pattern: /(?:ghu|ghs|ghr)_[A-Za-z0-9]{36}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },
  {
    id: 'github-refresh-token',
    name: 'GitHub Refresh Token',
    pattern: /ghr_[A-Za-z0-9]{76}/g,
    entropy: { min: 5.0, charset: 'A-Za-z0-9' },
  },

  // Stripe
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    pattern: /sk_live_[A-Za-z0-9]{24,99}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },
  {
    id: 'stripe-restricted-key',
    name: 'Stripe Restricted Key',
    pattern: /rk_live_[A-Za-z0-9]{24,99}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },

  // PayPal
  {
    id: 'paypal-braintree',
    name: 'PayPal Braintree Access Token',
    pattern: /access_token\$production\$[a-z0-9]{16}\$[a-f0-9]{32}/gi,
  },

  // Slack
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,32}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9' },
  },
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,10}\/B[A-Z0-9]{8,10}\/[A-Za-z0-9]{24}/g,
  },

  // Twilio
  {
    id: 'twilio-api-key',
    name: 'Twilio API Key',
    pattern: /SK[a-f0-9]{32}/g,
    entropy: { min: 4.0, charset: 'a-f0-9' },
  },

  // SendGrid
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    pattern: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/g,
    entropy: { min: 5.0, charset: 'A-Za-z0-9_-' },
  },

  // MailChimp
  {
    id: 'mailchimp-api-key',
    name: 'MailChimp API Key',
    pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g,
    entropy: { min: 4.0, charset: 'a-f0-9' },
  },

  // Mailgun
  {
    id: 'mailgun-api-key',
    name: 'Mailgun API Key',
    pattern: /key-[a-f0-9]{32}/g,
    entropy: { min: 4.0, charset: 'a-f0-9' },
  },

  // Square
  {
    id: 'square-access-token',
    name: 'Square Access Token',
    pattern: /sq0atp-[A-Za-z0-9_\-]{22}/g,
    entropy: { min: 4.5, charset: 'A-Za-z0-9_-' },
  },
  {
    id: 'square-oauth-secret',
    name: 'Square OAuth Secret',
    pattern: /sq0csp-[A-Za-z0-9_\-]{43}/g,
    entropy: { min: 5.0, charset: 'A-Za-z0-9_-' },
  },

  // Heroku
  {
    id: 'heroku-api-key',
    name: 'Heroku API Key',
    pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
    entropy: { min: 3.5, charset: 'a-f0-9' },
  },

  // Generic Patterns
  {
    id: 'generic-api-key',
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|access[_-]?key).{0,20}['\"]([A-Za-z0-9_\-]{32,})['\"]|Bearer\s+[A-Za-z0-9_\-\.]{32,}/gi,
    entropy: { min: 4.5, charset: 'A-Za-z0-9_-' },
  },
  {
    id: 'generic-secret',
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd|token).{0,20}['\"]([A-Za-z0-9_\-@#$%^&*+=]{16,})['\"](?!\s*:)/gi,
    entropy: { min: 4.0, charset: 'A-Za-z0-9_-@#$%^&*+=' },
  },

  // Private Keys
  {
    id: 'rsa-private-key',
    name: 'RSA Private Key',
    pattern: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    id: 'dsa-private-key',
    name: 'DSA Private Key',
    pattern: /-----BEGIN DSA PRIVATE KEY-----/g,
  },
  {
    id: 'ec-private-key',
    name: 'EC Private Key',
    pattern: /-----BEGIN EC PRIVATE KEY-----/g,
  },
  {
    id: 'pgp-private-key',
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
  },

  // Database Connection Strings
  {
    id: 'postgres-connection',
    name: 'PostgreSQL Connection String',
    pattern: /postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },
  {
    id: 'mysql-connection',
    name: 'MySQL Connection String',
    pattern: /mysql:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },
  {
    id: 'mongodb-connection',
    name: 'MongoDB Connection String',
    pattern: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_\-]+:[^@\s]+@[^\s]+/gi,
  },

  // JWT Tokens
  {
    id: 'jwt-token',
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
    entropy: { min: 5.0, charset: 'A-Za-z0-9_-' },
  },

  // SSH Keys
  {
    id: 'ssh-private-key',
    name: 'SSH Private Key',
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
  },
];

// Redact sensitive information
export function redactSecret(secret: string): string {
  if (secret.length <= 8) {
    return '***';
  }
  const visibleChars = Math.min(4, Math.floor(secret.length * 0.2));
  return secret.substring(0, visibleChars) + '***' + secret.substring(secret.length - visibleChars);
}

// Main scanning function
export function scanContent(content: string, filename: string = 'unknown'): ScanResult[] {
  const results: ScanResult[] = [];
  const lines = content.split('\n');

  for (const pattern of SECRET_PATTERNS) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      pattern.pattern.lastIndex = 0; // Reset regex state
      
      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(line)) !== null) {
        const matchedText = match[0];
        
        // Apply entropy check if specified
        if (pattern.entropy) {
          const entropy = calculateEntropy(matchedText);
          if (entropy < pattern.entropy.min) {
            continue;
          }
        }

        // Apply custom verification if specified
        if (pattern.verify && !pattern.verify(matchedText)) {
          continue;
        }

        results.push({
          file: filename,
          line: lineIndex + 1,
          column: match.index + 1,
          match: matchedText,
          type: pattern.name,
          severity: determineSeverity(pattern.id),
          description: `Detected ${pattern.name} in file`,
          redacted: redactSecret(matchedText),
        });
      }
    }
  }

  return results;
}

function determineSeverity(patternId: string): 'critical' | 'high' | 'medium' | 'low' {
  const critical = ['aws-secret-key', 'rsa-private-key', 'ssh-private-key', 'gcp-service-account'];
  const high = ['aws-access-key', 'github-pat', 'stripe-secret-key', 'postgres-connection'];
  const medium = ['generic-api-key', 'jwt-token'];
  
  if (critical.includes(patternId)) return 'critical';
  if (high.includes(patternId)) return 'high';
  if (medium.includes(patternId)) return 'medium';
  return 'low';
}
