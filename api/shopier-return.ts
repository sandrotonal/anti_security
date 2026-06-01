import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

interface TokenPayload {
  email: string;
  plan: string;
  expiresAt: number;
}

const SHOPIER_API_SECRET = process.env.SHOPIER_API_SECRET || 'your-shopier-api-secret';
const JWT_SECRET = process.env.JWT_SECRET || 'securify-local-development-secret-key-2026';
const SITE_URL = process.env.SITE_URL || 'https://securify.gucluyumhe.dev';

async function parseBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const data: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        data[key] = value;
      }
      resolve(data);
    });
  });
}

function signToken(payload: TokenPayload, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=invalid_method` });
    res.end();
    return;
  }

  try {
    const postData = await parseBody(req);
    const { platform_order_id, random_nr, signature, status } = postData;

    if (!platform_order_id || !random_nr || !signature || !status) {
      res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=missing_params` });
      res.end();
      return;
    }

    // Verify signature
    const data = random_nr + platform_order_id;
    const expectedSignature = createHmac('sha256', SHOPIER_API_SECRET)
      .update(data)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Shopier return signature mismatch!');
      res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=bad_signature` });
      res.end();
      return;
    }

    if (status !== 'success') {
      res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=payment_failed` });
      res.end();
      return;
    }

    // Decode email, plan and timestamp from order ID
    // orderId structure: base64url(email:plan:timestamp)
    let email = '';
    let plan = 'free';
    
    try {
      const base64 = platform_order_id.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        email = parts[0];
        plan = parts[1];
      }
    } catch (e) {
      console.error('Failed to decode platform_order_id:', e);
    }

    if (!email) {
      res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=invalid_order_id` });
      res.end();
      return;
    }

    // Set expiration (e.g., 30 days for Pro/Agency)
    const duration = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + duration;

    // Sign JWT token
    const token = signToken({ email, plan, expiresAt }, JWT_SECRET);

    // Redirect to frontend success page
    res.writeHead(302, { Location: `${SITE_URL}/?payment=success&token=${token}&email=${encodeURIComponent(email)}&plan=${plan}` });
    res.end();
  } catch (error: any) {
    console.error('Error handling Shopier return:', error);
    res.writeHead(302, { Location: `${SITE_URL}/?payment=failed&error=internal_error` });
    res.end();
  }
}
