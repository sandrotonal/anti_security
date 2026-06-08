import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac, timingSafeEqual } from 'crypto';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

async function parseRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => reject(err));
  });
}

function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(';');
    let ts = '';
    let h = '';

    for (const part of parts) {
      const [key, val] = part.split('=');
      if (key === 'ts') ts = val;
      else if (key === 'h') h = val;
    }

    if (!ts || !h) return false;

    // Concatenate TIMESTAMP + ":" + RAW_BODY
    const payload = `${ts}:${rawBody}`;

    const expectedHash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Secure timing-safe string comparison
    return timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch (error) {
    console.error('Webhook signature verification exception:', error);
    return false;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, paddle-signature');

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
    const signatureHeader = req.headers['paddle-signature'] as string;
    
    if (!signatureHeader) {
      console.error('Missing paddle-signature header');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing paddle-signature header' }));
      return;
    }

    // Extract raw body
    let rawBody = '';
    if ((req as any).body) {
      rawBody = typeof (req as any).body === 'string' 
        ? (req as any).body 
        : JSON.stringify((req as any).body);
    } else {
      rawBody = await parseRawBody(req);
    }

    // Validate Signature
    if (PADDLE_WEBHOOK_SECRET) {
      const isValid = verifySignature(rawBody, signatureHeader, PADDLE_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid Paddle Webhook signature');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
        return;
      }
    } else {
      console.warn('PADDLE_WEBHOOK_SECRET is not set. Skipping signature verification in development.');
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;

    console.log(`[Paddle Webhook] Received event: ${eventType}`, payload.data?.id);

    // Subscriptions/Billing lifecycle actions
    switch (eventType) {
      case 'transaction.completed':
        console.log('Transaction completed webhook successfully processed');
        break;
      case 'subscription.created':
        console.log('Subscription created');
        break;
      case 'subscription.updated':
        console.log('Subscription updated');
        break;
      case 'subscription.canceled':
        console.log('Subscription canceled');
        break;
      default:
        console.log(`Unhandled Paddle event type: ${eventType}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
  } catch (error: any) {
    console.error('Paddle Webhook error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
