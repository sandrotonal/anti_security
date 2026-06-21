import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  body: any;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

const safeFetch = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 6000); // 6s timeout
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const verifyGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const res = await safeFetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Securify-Scanner-Agent'
      }
    });
    return res.status === 200;
  } catch {
    return false;
  }
};

const verifyStripeKey = async (token: string): Promise<boolean> => {
  try {
    const res = await safeFetch('https://api.stripe.com/v1/charges?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // If it returns unauthorized (401), it's invalid. If it succeeds (200) or returns some other API error (400, 403), it's an active key.
    return res.status !== 401;
  } catch {
    return false;
  }
};

const verifyGoogleMapsKey = async (key: string): Promise<boolean> => {
  try {
    const res = await safeFetch(`https://maps.googleapis.com/maps/api/timezone/json?location=39.9,32.8&timestamp=1331161200&key=${key}`, {});
    const data = await res.json() as any;
    // Google Maps API returns status: "REQUEST_DENIED" or "REQUEST_DENIED" with message "The provided API key is invalid."
    return data && data.status !== 'REQUEST_DENIED';
  } catch {
    return false;
  }
};

const verifySupabaseKey = async (token: string): Promise<boolean> => {
  try {
    // Supabase Service/Anon Role is a JWT. Let's decode it to extract the issuer (iss) project URL.
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as { iss?: string };
    
    if (!payload.iss || !payload.iss.includes('supabase.co')) {
      return false;
    }
    
    // Construct the REST API url from issuer
    const restUrl = payload.iss.replace('/auth/v1', '/rest/v1/');
    
    const res = await safeFetch(restUrl, {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Supabase REST root will return 200/204 or 400 (if no tables/empty), but not 401/403 unauthorized.
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  try {
    // Parse request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const bodyStr = Buffer.concat(chunks).toString('utf8');
    
    if (!bodyStr) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing request body' }));
      return;
    }

    const payload = JSON.parse(bodyStr) as { type: string; secret: string };
    const { type, secret } = payload;

    if (!type || !secret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'type and secret parameters are required' }));
      return;
    }

    let active = false;
    const cleanType = type.toLowerCase();

    if (cleanType.includes('github')) {
      active = await verifyGitHubToken(secret);
    } else if (cleanType.includes('stripe')) {
      active = await verifyStripeKey(secret);
    } else if (cleanType.includes('google') || cleanType.includes('gcp')) {
      active = await verifyGoogleMapsKey(secret);
    } else if (cleanType.includes('supabase')) {
      active = await verifySupabaseKey(secret);
    } else {
      // Unsupported type or generic entropy key, default to true if regex matched
      active = true;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ active }));
  } catch (error: any) {
    console.error('Active verification failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal server error', message: error.message }));
  }
}
