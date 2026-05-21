import {serve} from 'bun';

import {routes} from './api/routes';
import {G1TeleprompterApp} from './app';
import {buildProxyHeaders} from './startup';
import indexDev from './webview/index.html';
import indexProd from './webview/index.prod.html';

const PORT = parseInt(process.env.PORT || '3333', 10);
const BUN_PORT = PORT + 1;
const isDevelopment = process.env.NODE_ENV === 'development';
const packageName = process.env.PACKAGE_NAME || 'com.mentra.g1-teleprompter';
const apiKey = process.env.MENTRAOS_API_KEY;
const resolvedApiKey = apiKey?.trim();

serve({
  port: BUN_PORT,
  development: isDevelopment ? {hmr: true} : false,
  routes: {
    ...routes,
    '/*': isDevelopment ? indexDev : indexProd,
  },
});

if (!resolvedApiKey) {
  console.warn(
    `[g1-teleprompter] MENTRAOS_API_KEY is not set. Skipping AppServer startup; webview-only development is available at http://localhost:${BUN_PORT}`,
  );
} else {
  const app = new G1TeleprompterApp({
    packageName,
    apiKey: resolvedApiKey,
    port: PORT,
  });

  await app.start();

  const expressApp = app.getExpressApp();

  expressApp.all('*', async (req, res) => {
    try {
      const bunUrl = `http://localhost:${BUN_PORT}${req.originalUrl || req.url}`;
      const authReq = req as typeof req & {authUserId?: string; activeSession?: unknown};
      const response = await fetch(bunUrl, {
        method: req.method,
        headers: buildProxyHeaders({
          headers: req.headers as Record<string, string | string[] | undefined>,
          authUserId: authReq.authUserId,
          hasActiveSession: Boolean(authReq.activeSession),
        }),
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      res.status(response.status);
      res.send(await response.text());
    } catch (error) {
      console.error('[g1-teleprompter] Proxy error:', error);
      res.status(500).send('Proxy error');
    }
  });
}
