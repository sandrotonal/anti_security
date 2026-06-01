import type { IncomingMessage, ServerResponse } from 'http';
import { createHmac } from 'crypto';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  body: any;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

interface TokenPayload {
  email: string;
  plan: string;
  expiresAt: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'securify-local-development-secret-key-2026';

function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (Date.now() > payload.expiresAt) return null;
    
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to query param
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      token = url.searchParams.get('token') || '';
    }

    if (!token) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'token parameter is required' }));
      return;
    }

    const payload = verifyToken(token, JWT_SECRET);

    if (!payload) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: 'invalid or expired token' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      valid: true,
      email: payload.email,
      plan: payload.plan,
      expiresAt: payload.expiresAt,
    }));
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal server error', message: error.message }));
  }
}
