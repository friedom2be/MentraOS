import {serve} from 'bun';

import {routes} from './api/routes';
import {G1TeleprompterApp} from './app';
import {createProxyHandler, getStartupConfig, shouldStartAppServer} from './startup';
import indexDev from './webview/index.html';
import indexProd from './webview/index.prod.html';

const config = getStartupConfig(process.env);

serve({
  port: config.bunPort,
  development: config.isDevelopment ? {hmr: true} : false,
  routes: {
    ...routes,
    '/*': config.isDevelopment ? indexDev : indexProd,
  },
});

if (!shouldStartAppServer(config)) {
  console.warn(
    `[g1-teleprompter] MENTRAOS_API_KEY is not set. Skipping AppServer startup; webview-only development is available at http://localhost:${config.bunPort}`,
  );
} else {
  const app = new G1TeleprompterApp({
    packageName: config.packageName,
    apiKey: config.apiKey!,
    port: config.port,
  });

  await app.start();

  const expressApp = app.getExpressApp();
  expressApp.all('*', createProxyHandler(config.bunPort));
}
