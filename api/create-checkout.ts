import type { IncomingMessage, ServerResponse } from 'http';

const PADDLE_ENV = process.env.PADDLE_ENV || 'sandbox';
const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.NEXT_PUBLIC_CLIENT_TOKEN || '';

const PADDLE_PRICE_PRO_MONTHLY = process.env.PADDLE_PRICE_PRO_MONTHLY || process.env.PADDLE_PRO_MONTHLY || '';
const PADDLE_PRICE_PRO_YEARLY = process.env.PADDLE_PRICE_PRO_YEARLY || process.env.PADDLE_PRO_YEARLY || '';
const PADDLE_PRICE_AGENCY_MONTHLY = process.env.PADDLE_PRICE_AGENCY_MONTHLY || process.env.PADDLE_AGENCY_MONTHLY || '';
const PADDLE_PRICE_AGENCY_YEARLY = process.env.PADDLE_PRICE_AGENCY_YEARLY || process.env.PADDLE_AGENCY_YEARLY || '';

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
    const { email, plan, billing } = body;

    console.log('[Paddle Create Checkout] Request body:', { email, plan, billing });
    console.log('[Paddle Create Checkout] Environment Config:', {
      PADDLE_ENV,
      PADDLE_CLIENT_TOKEN_PREFIX: PADDLE_CLIENT_TOKEN ? `${PADDLE_CLIENT_TOKEN.substring(0, 18)}... (len: ${PADDLE_CLIENT_TOKEN.length})` : 'undefined',
      PADDLE_PRICE_PRO_MONTHLY_PREFIX: PADDLE_PRICE_PRO_MONTHLY ? `${PADDLE_PRICE_PRO_MONTHLY.substring(0, 12)}... (len: ${PADDLE_PRICE_PRO_MONTHLY.length})` : 'undefined',
      PADDLE_PRICE_PRO_YEARLY_PREFIX: PADDLE_PRICE_PRO_YEARLY ? `${PADDLE_PRICE_PRO_YEARLY.substring(0, 12)}... (len: ${PADDLE_PRICE_PRO_YEARLY.length})` : 'undefined',
      PADDLE_PRICE_AGENCY_MONTHLY_PREFIX: PADDLE_PRICE_AGENCY_MONTHLY ? `${PADDLE_PRICE_AGENCY_MONTHLY.substring(0, 12)}... (len: ${PADDLE_PRICE_AGENCY_MONTHLY.length})` : 'undefined',
      PADDLE_PRICE_AGENCY_YEARLY_PREFIX: PADDLE_PRICE_AGENCY_YEARLY ? `${PADDLE_PRICE_AGENCY_YEARLY.substring(0, 12)}... (len: ${PADDLE_PRICE_AGENCY_YEARLY.length})` : 'undefined',
    });

    if (!email || !plan) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and plan are required' }));
      return;
    }

    // Determine the Price ID based on plan and billing
    let priceId = '';
    const planLower = plan.toLowerCase();
    const billingLower = (billing || 'monthly').toLowerCase();

    if (planLower === 'pro') {
      priceId = billingLower === 'yearly' ? PADDLE_PRICE_PRO_YEARLY : PADDLE_PRICE_PRO_MONTHLY;
    } else if (planLower === 'agency') {
      priceId = billingLower === 'yearly' ? PADDLE_PRICE_AGENCY_YEARLY : PADDLE_PRICE_AGENCY_MONTHLY;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid plan' }));
      return;
    }

    // Auto-detect environment based on PADDLE_CLIENT_TOKEN prefix to prevent mismatch errors
    let environment = PADDLE_ENV;
    if (
      PADDLE_CLIENT_TOKEN.startsWith('live_') ||
      PADDLE_CLIENT_TOKEN.startsWith('paddletoken_live_') ||
      PADDLE_CLIENT_TOKEN.includes('_live_')
    ) {
      environment = 'production';
    } else if (
      PADDLE_CLIENT_TOKEN.startsWith('test_') ||
      PADDLE_CLIENT_TOKEN.startsWith('paddletoken_test_') ||
      PADDLE_CLIENT_TOKEN.includes('_test_')
    ) {
      environment = 'sandbox';
    }

    if (!priceId) {
      // In sandbox mode, we can provide a default mock value to ease local development/testing
      if (environment === 'sandbox') {
        priceId = `mock_${plan}_${billing || 'monthly'}`;
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payment gateway price ID is not configured' }));
        return;
      }
    }

    console.log('[Paddle Create Checkout] Resolved values:', { priceId, environment });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      priceId,
      clientToken: PADDLE_CLIENT_TOKEN,
      environment,
      email: email.trim().toLowerCase(),
      plan,
      billing: billing || 'monthly'
    }));
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
