import type { IncomingMessage, ServerResponse } from 'http';

const PADDLE_ENV = process.env.PADDLE_ENV || 'sandbox';
const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || '';

const PADDLE_PRICE_PRO_MONTHLY = process.env.PADDLE_PRICE_PRO_MONTHLY || '';
const PADDLE_PRICE_PRO_YEARLY = process.env.PADDLE_PRICE_PRO_YEARLY || '';
const PADDLE_PRICE_AGENCY_MONTHLY = process.env.PADDLE_PRICE_AGENCY_MONTHLY || '';
const PADDLE_PRICE_AGENCY_YEARLY = process.env.PADDLE_PRICE_AGENCY_YEARLY || '';

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

    if (!email || !plan) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and plan are required' }));
      return;
    }

    // Determine the Price ID based on plan and billing
    let priceId = '';
    if (plan === 'pro') {
      priceId = billing === 'yearly' ? PADDLE_PRICE_PRO_YEARLY : PADDLE_PRICE_PRO_MONTHLY;
    } else if (plan === 'agency') {
      priceId = billing === 'yearly' ? PADDLE_PRICE_AGENCY_YEARLY : PADDLE_PRICE_AGENCY_MONTHLY;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid plan' }));
      return;
    }

    if (!priceId) {
      // In sandbox mode, we can provide a default mock value to ease local development/testing
      if (PADDLE_ENV === 'sandbox') {
        priceId = `mock_${plan}_${billing || 'monthly'}`;
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payment gateway price ID is not configured' }));
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      priceId,
      clientToken: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENV,
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
