import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  send: (body: any) => void;
}

// XML entities escaping to prevent XSS / markup injection inside SVG
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
    const domain = urlObj.searchParams.get('domain') || 'unknown domain';
    const grade = (urlObj.searchParams.get('grade') || 'N/A').toUpperCase();

    // Determine colors based on grade
    let color = '#a3a3a3'; // default neutral grey
    let pillBg = 'rgba(115, 115, 115, 0.1)';
    let pillBorder = 'rgba(115, 115, 115, 0.2)';

    if (grade === 'A+' || grade === 'A') {
      color = '#10b981'; // emerald-400
      pillBg = 'rgba(16, 185, 129, 0.1)';
      pillBorder = 'rgba(16, 185, 129, 0.2)';
    } else if (grade === 'B') {
      color = '#f59e0b'; // amber-500
      pillBg = 'rgba(245, 158, 11, 0.1)';
      pillBorder = 'rgba(245, 158, 11, 0.2)';
    } else if (grade === 'C') {
      color = '#f97316'; // orange-500
      pillBg = 'rgba(249, 115, 22, 0.1)';
      pillBorder = 'rgba(249, 115, 22, 0.2)';
    } else if (grade === 'D' || grade === 'F') {
      color = '#ef4444'; // red-500
      pillBg = 'rgba(239, 68, 68, 0.1)';
      pillBorder = 'rgba(239, 68, 68, 0.2)';
    }

    // Clean/truncate domain for visual fit
    let cleanDomain = domain.trim().toLowerCase();
    if (/^https?:\/\//i.test(cleanDomain)) {
      try {
        cleanDomain = new URL(cleanDomain).hostname;
      } catch {
        // ignore
      }
    }
    if (cleanDomain.length > 22) {
      cleanDomain = cleanDomain.substring(0, 19) + '...';
    }

    const escapedDomain = escapeXml(cleanDomain);
    const escapedGrade = escapeXml(grade);

    // SVG code
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="40" viewBox="0 0 260 40">
  <defs>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141414" />
      <stop offset="100%" stop-color="#070707" />
    </linearGradient>
  </defs>
  <rect width="258" height="38" x="1" y="1" rx="10" fill="url(#glow)" stroke="#262626" stroke-width="1" />
  
  <!-- Securify Logo (Branded Trust Badge) -->
  <g transform="translate(12, 11) scale(0.0703125)">
    <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" fill="${color}" />
  </g>

  <!-- Text elements -->
  <text x="36" y="24" fill="#888888" font-family="monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif" font-size="10" font-weight="500" letter-spacing="0.5">securify: verified</text>
  <text x="195" y="24" fill="#cccccc" font-family="monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif" font-size="9" font-weight="300" text-anchor="end" opacity="0.85">${escapedDomain}</text>
  
  <!-- Grade Badge -->
  <rect x="204" y="8" width="44" height="24" rx="6" fill="${pillBg}" stroke="${pillBorder}" stroke-width="1"/>
  <text x="226" y="24" fill="${color}" font-family="monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${escapedGrade}</text>
</svg>`;

    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(svg);
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Internal Server Error: ${error.message}`);
  }
}
