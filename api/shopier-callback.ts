import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

const SHOPIER_API_SECRET = process.env.SHOPIER_WEBHOOK_TOKEN || process.env.SHOPIER_API_SECRET || 'your-shopier-api-secret';

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const postData = (req as any).body && Object.keys((req as any).body).length > 0
      ? (req as any).body
      : await parseBody(req);
    const { platform_order_id, random_nr, signature, status, total_order_value, currency } = postData;

    if (!platform_order_id || !random_nr || !signature || !status || !total_order_value || !currency) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required parameters' }));
      return;
    }

    // Verify signature
    const data = random_nr + platform_order_id + total_order_value + currency;
    const expectedSignature = createHmac('sha256', SHOPIER_API_SECRET)
      .update(data)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Shopier webhook callback signature mismatch!');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    // Log the transaction
    console.log(`[Shopier Webhook] Order ${platform_order_id} status: ${status}`);

    // Return success to Shopier
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } catch (error: any) {
    console.error('Error handling Shopier callback webhook:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
