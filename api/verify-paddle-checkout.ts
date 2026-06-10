import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

interface TokenPayload {
  email: string;
  plan: string;
  expiresAt: number;
}

const PADDLE_ENV = process.env.PADDLE_ENV || 'sandbox';
const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.NEXT_PUBLIC_CLIENT_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || 'securify-local-development-secret-key-2026';

// Auto-detect environment based on key/token prefix to prevent mismatch errors
let environment = PADDLE_ENV;
if (
  PADDLE_API_KEY.startsWith('pdl_live_') ||
  PADDLE_CLIENT_TOKEN.startsWith('live_') ||
  PADDLE_CLIENT_TOKEN.startsWith('paddletoken_live_') ||
  PADDLE_CLIENT_TOKEN.includes('_live_')
) {
  environment = 'production';
} else if (
  PADDLE_API_KEY.startsWith('pdl_test_') ||
  PADDLE_CLIENT_TOKEN.startsWith('test_') ||
  PADDLE_CLIENT_TOKEN.startsWith('paddletoken_test_') ||
  PADDLE_CLIENT_TOKEN.includes('_test_')
) {
  environment = 'sandbox';
}

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

    console.log('[Paddle Verify Checkout] Request body:', { transaction_id, email, plan });
    console.log('[Paddle Verify Checkout] Config:', {
      PADDLE_ENV,
      environment,
      PADDLE_API_KEY_PREFIX: PADDLE_API_KEY ? `${PADDLE_API_KEY.substring(0, 10)}... (len: ${PADDLE_API_KEY.length})` : 'undefined',
      PADDLE_CLIENT_TOKEN_PREFIX: PADDLE_CLIENT_TOKEN ? `${PADDLE_CLIENT_TOKEN.substring(0, 18)}... (len: ${PADDLE_CLIENT_TOKEN.length})` : 'undefined',
    });

    if (!transaction_id || !email) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'transaction_id and email are required' }));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Local Sandbox environment fallback: Bypass API validation if PADDLE_API_KEY is not defined
    if (environment === 'sandbox' && !PADDLE_API_KEY) {
      console.log(`[Paddle Sandbox Bypass] Simulating transaction verification for: ${transaction_id}`);
      
      const resolvedPlan = plan || 'Pro';
      const duration = 30 * 24 * 60 * 60 * 1000; // 30 days
      const expiresAt = Date.now() + duration;
      const token = signToken({ email: trimmedEmail, plan: resolvedPlan, expiresAt }, JWT_SECRET);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        email: trimmedEmail,
        plan: resolvedPlan
      }));
      return;
    }

    if (!PADDLE_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Paddle API Key is not configured on the server' }));
      return;
    }

    // Call Paddle API to retrieve the transaction
    const baseUrl = environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
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

    // Resolve plan dynamically
    const resolvedPlan = plan ? plan : txnPlan;

    if (!resolvedPlan) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Plan type could not be resolved from transaction metadata' }));
      return;
    }

    if (txnEmail !== trimmedEmail || txnPlan.toLowerCase() !== resolvedPlan.toLowerCase()) {
      console.error(`Paddle Transaction details mismatch! Expected email: ${trimmedEmail}, plan: ${resolvedPlan}. Got email: ${txnEmail}, plan: ${txnPlan}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Transaction metadata mismatch' }));
      return;
    }

    // Generate subscription duration (monthly vs yearly)
    const isYearly = customData.billing === 'yearly';
    const duration = (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + duration;

    // Sign JWT token
    const token = signToken({ email: trimmedEmail, plan: resolvedPlan, expiresAt }, JWT_SECRET);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      token,
      email: trimmedEmail,
      plan: resolvedPlan
    }));
  } catch (error: any) {
    console.error('Error verifying Paddle checkout:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
