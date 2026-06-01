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
          if (req.url && req.url.startsWith('/api/scan-site')) {
            try {
              // Dynamically load the TypeScript API handler using Vite's built-in transformer
              const module = await server.ssrLoadModule('./api/scan-site.ts');
              const handler = module.default;

              // Mock Vercel response API
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

              // Mock Vercel request API
              const vercelReq = Object.assign(req, {
                query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
                body: null
              });

              await handler(vercelReq, vercelRes);
            } catch (err: any) {
              console.error('Local API execution failed:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'failed to perform site scan', message: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
})
