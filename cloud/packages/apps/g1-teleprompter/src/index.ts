import {serve} from 'bun';

import {routes} from './api/routes';
import {G1TeleprompterApp} from './app';
import indexDev from './webview/index.html';
import indexProd from './webview/index.prod.html';

const PORT = parseInt(process.env.PORT || '3333', 10);
const BUN_PORT = PORT + 1;
const isDevelopment = process.env.NODE_ENV === 'development';

serve({
  port: BUN_PORT,
  development: isDevelopment ? {hmr: true} : false,
  routes: {
    ...routes,
    '/*': isDevelopment ? indexDev : indexProd,
  },
});

const app = new G1TeleprompterApp({
  packageName: process.env.PACKAGE_NAME || 'com.mentra.g1-teleprompter',
  apiKey: process.env.MENTRAOS_API_KEY || '',
  port: PORT,
});

await app.start();
