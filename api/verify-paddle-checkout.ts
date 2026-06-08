import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

interface TokenPayload {
  email: string;
  plan: string;
  expiresAt: number;
}

const PADDLE_ENV = process.env.PADDLE_ENV || 'sandbox';
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'securify-local-development-secret-key-2026';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = (req as any).body && Object.keys((req as any).body).length > 0
      ? (req as any).body
      : await parseJsonBody(req);
    const { transaction_id, email, plan } = body;

    if (!transaction_id || !email || !plan) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'transaction_id, email, and plan are required' }));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Local Sandbox environment fallback: Bypass API validation if PADDLE_API_KEY is not defined
    if (PADDLE_ENV === 'sandbox' && !PADDLE_API_KEY) {
      console.log(`[Paddle Sandbox Bypass] Simulating transaction verification for: ${transaction_id}`);
      
      const duration = 30 * 24 * 60 * 60 * 1000; // 30 days
      const expiresAt = Date.now() + duration;
      const token = signToken({ email: trimmedEmail, plan, expiresAt }, JWT_SECRET);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        email: trimmedEmail,
        plan
      }));
      return;
    }

    if (!PADDLE_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Paddle API Key is not configured on the server' }));
      return;
    }

    // Call Paddle API to retrieve the transaction
    const baseUrl = PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
    const response = await fetch(`${baseUrl}/transactions/${transaction_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PADDLE_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Paddle API Error:', errBody);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to verify transaction with Paddle API', details: errBody }));
      return;
    }

    const json = await response.json();
    const data = json.data;

    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Transaction not found in Paddle response' }));
      return;
    }

    // Check transaction status
    if (data.status !== 'completed') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Transaction status is '${data.status}', must be 'completed'` }));
      return;
    }

    // Verify custom data
    const customData = data.custom_data || {};
    const txnEmail = (customData.email || '').trim().toLowerCase();
    const txnPlan = customData.plan || '';

    if (txnEmail !== trimmedEmail || txnPlan !== plan) {
      console.error(`Paddle Transaction details mismatch! Expected email: ${trimmedEmail}, plan: ${plan}. Got email: ${txnEmail}, plan: ${txnPlan}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Transaction metadata mismatch' }));
      return;
    }

    // Generate subscription duration (monthly vs yearly)
    const isYearly = customData.billing === 'yearly';
    const duration = (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + duration;

    // Sign JWT token
    const token = signToken({ email: trimmedEmail, plan, expiresAt }, JWT_SECRET);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      token,
      email: trimmedEmail,
      plan
    }));
  } catch (error: any) {
    console.error('Error verifying Paddle checkout:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
