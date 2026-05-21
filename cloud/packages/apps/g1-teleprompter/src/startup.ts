export interface StartupConfig {
  port: number;
  bunPort: number;
  isDevelopment: boolean;
  packageName: string;
  apiKey: string | undefined;
}

export function getStartupConfig(env: Record<string, string | undefined>): StartupConfig {
  const port = parseInt(env.PORT || '3333', 10);

  return {
    port,
    bunPort: port + 1,
    isDevelopment: env.NODE_ENV === 'development',
    packageName: env.PACKAGE_NAME || 'com.mentra.g1-teleprompter',
    apiKey: env.MENTRAOS_API_KEY?.trim(),
  };
}

export function shouldStartAppServer(config: StartupConfig): boolean {
  return Boolean(config.apiKey);
}

function buildProxyHeaders({
  headers,
  authUserId,
  hasActiveSession,
}: {
  headers: Record<string, string | string[] | undefined>;
  authUserId?: string;
  hasActiveSession?: boolean;
}): Record<string, string> {
  const proxyHeaders: Record<string, string> = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      proxyHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  });

  if (authUserId) {
    proxyHeaders['x-auth-user-id'] = authUserId;
  }

  if (hasActiveSession) {
    proxyHeaders['x-has-active-session'] = 'true';
  }

  return proxyHeaders;
}

export function createProxyHandler(bunPort: number) {
  return async (req: any, res: any) => {
    try {
      const bunUrl = `http://localhost:${bunPort}${req.originalUrl || req.url}`;
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
  };
}
