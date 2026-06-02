import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-routing',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const pathname = urlObj.pathname;
              const endpoint = pathname.replace('/api/', '');

              const module = await server.ssrLoadModule(`./api/${endpoint}.ts`);
              const handler = module.default;

              const vercelRes = Object.assign(res, {
                status(code: number) {
                  res.statusCode = code;
                  return vercelRes;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                },
                send(data: any) {
                  res.end(data);
                }
              });

              let body = null;
              if (req.method === 'POST' || req.method === 'PUT') {
                body = await new Promise<any>((resolve) => {
                  let accum = '';
                  req.on('data', chunk => { accum += chunk; });
                  req.on('end', () => {
                    try { resolve(JSON.parse(accum)); } catch { resolve({}); }
                  });
                });
              }

              const vercelReq = Object.assign(req, {
                query: Object.fromEntries(urlObj.searchParams),
                body
              });

              await handler(vercelReq, vercelRes);
            } catch (err: any) {
              console.error('Local API execution failed:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'failed to execute api routing', message: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],

  build: {
    // Raise warning threshold to avoid noisy output
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Separate large page components into lazy chunks
          if (id.includes('SecurifyDashboard')) return 'page-dashboard';
          if (id.includes('SecurifySandbox')) return 'page-sandbox';
          if (id.includes('SecurifyAuditor')) return 'page-auditor';
          if (id.includes('SecurifyInstall')) return 'page-install';
        },
      },
    },
  },
})

