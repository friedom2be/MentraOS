import {serve} from 'bun';

import {routes} from './api/routes';
import {G1TeleprompterApp} from './app';
import {createProxyHandler, getStartupConfig, shouldStartAppServer} from './startup';
import indexDev from './webview/index.html';
import {getProdAsset, getProdHtml} from './webview/html';

const config = getStartupConfig(process.env);
const sigintListeners = new Set(process.listeners('SIGINT'));
const sigtermListeners = new Set(process.listeners('SIGTERM'));
const prodHtml = config.isDevelopment ? null : await getProdHtml();
const prodAssetRoutes = config.isDevelopment
  ? {}
  : {
      '/dist/frontend.css': new Response(getProdAsset('frontend.css')),
      '/dist/frontend.js': new Response(getProdAsset('frontend.js')),
      '/dist/frontend.js.map': new Response(getProdAsset('frontend.js.map')),
    };

const bunServer = serve({
  port: config.bunPort,
  development: config.isDevelopment ? {hmr: true} : false,
  routes: {
    ...routes,
    ...prodAssetRoutes,
    '/*':
      config.isDevelopment
        ? indexDev
        : new Response(prodHtml, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          }),
  },
});

let app: G1TeleprompterApp | undefined;
let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  bunServer.stop(true);

  if (app) {
    await app.stop();
    return;
  }

  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

if (!shouldStartAppServer(config)) {
  console.warn(
    `[g1-teleprompter] MENTRAOS_API_KEY is not set. Skipping AppServer startup; webview-only development is available at http://localhost:${config.bunPort}`,
  );
} else {
  app = new G1TeleprompterApp({
    packageName: config.packageName,
    apiKey: config.apiKey!,
    port: config.port,
  });

  for (const listener of process.listeners('SIGINT')) {
    if (!sigintListeners.has(listener)) {
      process.removeListener('SIGINT', listener);
    }
  }

  for (const listener of process.listeners('SIGTERM')) {
    if (!sigtermListeners.has(listener)) {
      process.removeListener('SIGTERM', listener);
    }
  }

  await app.start();

  const expressApp = app.getExpressApp();
  expressApp.all('*', createProxyHandler(config.bunPort));
}
