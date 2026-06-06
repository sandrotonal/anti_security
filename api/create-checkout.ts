import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

const SHOPIER_API_KEY = process.env.SHOPIER_API_KEY || 'your-shopier-api-key';
const SHOPIER_API_SECRET = process.env.SHOPIER_API_SECRET || 'your-shopier-api-secret';
const SITE_URL = process.env.SITE_URL || 'https://securify.gucluyumhe.dev';

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

    // Determine price based on plan and billing
    let price = 19;
    if (plan === 'pro') {
      price = billing === 'yearly' ? 190 : 19;
    } else if (plan === 'agency') {
      price = billing === 'yearly' ? 790 : 79;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid plan' }));
      return;
    }

    // Create unique platform_order_id: base64url(email:plan:timestamp)
    const timestamp = Date.now();
    const orderData = `${email}:${plan}:${timestamp}`;
    const platform_order_id = Buffer.from(orderData).toString('base64url');

    // Shopier checkout URL and params
    const shopierUrl = 'https://www.shopier.com/ShowProduct/api_pay4.php';
    
    // We will generate the parameters that the frontend will submit via POST form
    const formParams: Record<string, string> = {
      API_key: SHOPIER_API_KEY,
      website: 'securify.gucluyumhe.dev',
      platform_order_id: platform_order_id,
      product_name: `Securify ${plan === 'pro' ? 'Pro' : 'Agency'} (${billing || 'monthly'})`,
      product_type: '0', // 0 = Digital product
      buyer_name: 'Securify',
      buyer_surname: 'User',
      buyer_email: email,
      buyer_phone: '05555555555',
      total_order_value: price.toString(),
      currency: '1', // 1 = TRY (You can adjust based on Shopier account currency settings)
      current_language: 'tr',
      callback_url: `${SITE_URL}/api/shopier-return`,
    };

    // Calculate Shopier hash signature for frontend form submission
    // Shopier signature is created using key, website, order_id, product_name, price, currency, lang, and api_secret
    const hashData = 
      formParams.API_key + 
      formParams.website + 
      formParams.platform_order_id + 
      formParams.product_name + 
      formParams.total_order_value + 
      formParams.currency + 
      formParams.current_language + 
      SHOPIER_API_SECRET;

    const signature = createHmac('sha256', SHOPIER_API_SECRET)
      .update(hashData)
      .digest('base64');

    formParams.sign = signature;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      shopierUrl,
      fields: formParams
    }));
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
}
