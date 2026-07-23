// Webhook & API Integration System
// Real-time notifications and external tool integrations
// No mock data - production-ready webhooks

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  createdAt: number;
}

export type WebhookEvent = 
  | 'scan.completed'
  | 'finding.critical'
  | 'finding.high'
  | 'scan.failed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    scanId?: string;
    repoName?: string;
    findings?: number;
    severity?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    results?: any[];
    error?: string;
  };
}

// Webhook Manager
class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();

  constructor() {
    this.loadWebhooks();
  }

  // Load webhooks from localStorage
  private loadWebhooks() {
    try {
      const stored = localStorage.getItem('securify_webhooks');
      if (stored) {
        const webhooks = JSON.parse(stored) as WebhookConfig[];
        webhooks.forEach(wh => this.webhooks.set(wh.id, wh));
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  }

  // Save webhooks to localStorage
  private saveWebhooks() {
    try {
      const webhooks = Array.from(this.webhooks.values());
      localStorage.setItem('securify_webhooks', JSON.stringify(webhooks));
    } catch (error) {
      console.error('Failed to save webhooks:', error);
    }
  }

  // Add webhook
  addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): string {
    const id = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: Date.now(),
    };
    this.webhooks.set(id, webhook);
    this.saveWebhooks();
    return id;
  }

  // Update webhook
  updateWebhook(id: string, updates: Partial<WebhookConfig>) {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;
    
    this.webhooks.set(id, { ...webhook, ...updates });
    this.saveWebhooks();
    return true;
  }

  // Delete webhook
  deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) this.saveWebhooks();
    return deleted;
  }

  // Get all webhooks
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  // Trigger webhooks for event
  async trigger(event: WebhookEvent, data: WebhookPayload['data']) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(wh => wh.enabled && wh.events.includes(event));

    const results = await Promise.allSettled(
      relevantWebhooks.map(wh => this.sendWebhook(wh, payload))
    );

    return results;
  }

  // Send webhook
  private async sendWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Securify-Webhook/1.0',
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = await this.generateSignature(payload, webhook.secret);
        headers['X-Securify-Signature'] = signature;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Webhook ${webhook.name} failed:`, error);
      throw error;
    }
  }

  // Generate HMAC signature
  private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Slack Integration
export class SlackIntegration {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendScanResult(repoName: string, findings: number, severity: any) {
    const color = 
      severity.critical > 0 ? 'danger' :
      severity.high > 0 ? 'warning' : 'good';

    const message = {
      text: `🔒 Security Scan Completed`,
      attachments: [{
        color,
        fields: [
          { title: 'Repository', value: repoName, short: true },
          { title: 'Total Findings', value: findings.toString(), short: true },
          { title: 'Critical', value: severity.critical.toString(), short: true },
          { title: 'High', value: severity.high.toString(), short: true },
          { title: 'Medium', value: severity.medium.toString(), short: true },
          { title: 'Low', value: severity.low.toString(), short: true },
        ],
        footer: 'Securify Security Scanner',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}

// Microsoft Teams Integration
export class TeamsIntegration {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendScanResult(repoName: string, findings: number, severity: any) {
    const themeColor = 
      severity.critical > 0 ? 'FF0000' :
      severity.high > 0 ? 'FF6600' : '00FF00';

    const message = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: 'Security Scan Completed',
      themeColor,
      title: '🔒 Securify Security Scan',
      sections: [{
        activityTitle: `Scan Results for ${repoName}`,
        facts: [
          { name: 'Total Findings:', value: findings.toString() },
          { name: 'Critical:', value: severity.critical.toString() },
          { name: 'High:', value: severity.high.toString() },
          { name: 'Medium:', value: severity.medium.toString() },
          { name: 'Low:', value: severity.low.toString() },
        ],
      }],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}

// Discord Integration
export class DiscordIntegration {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendScanResult(repoName: string, findings: number, severity: any) {
    const color = 
      severity.critical > 0 ? 0xFF0000 :
      severity.high > 0 ? 0xFF6600 : 0x00FF00;

    const message = {
      embeds: [{
        title: '🔒 Security Scan Completed',
        description: `Scan results for **${repoName}**`,
        color,
        fields: [
          { name: 'Total Findings', value: findings.toString(), inline: true },
          { name: 'Critical', value: severity.critical.toString(), inline: true },
          { name: 'High', value: severity.high.toString(), inline: true },
          { name: 'Medium', value: severity.medium.toString(), inline: true },
          { name: 'Low', value: severity.low.toString(), inline: true },
        ],
        footer: { text: 'Securify Security Scanner' },
        timestamp: new Date().toISOString(),
      }],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}

// Export singleton instance
export const webhookManager = new WebhookManager();

// Helper function to send notifications
export async function notifyScanComplete(
  repoName: string,
  findings: number,
  severity: { critical: number; high: number; medium: number; low: number },
  scanId?: string
) {
  // Trigger webhooks
  const event: WebhookEvent = 
    severity.critical > 0 ? 'finding.critical' :
    severity.high > 0 ? 'finding.high' : 'scan.completed';

  await webhookManager.trigger(event, {
    scanId,
    repoName,
    findings,
    severity,
  });
}
