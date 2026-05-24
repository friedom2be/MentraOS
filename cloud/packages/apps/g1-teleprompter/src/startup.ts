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

interface ProxyRequest {
  method: string;
  originalUrl?: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  authUserId?: string;
  activeSession?: unknown;
}

interface ProxyResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ProxyResponse;
  send(body?: string | Uint8Array | Buffer): void;
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
    if (value && key !== 'content-length' && key !== 'host') {
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

function buildProxyBody(req: ProxyRequest): BodyInit | undefined {
  if (req.method === 'GET' || req.method === 'HEAD' || req.body == null) {
    return undefined;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  if (req.body instanceof Uint8Array) {
    return new Blob([Uint8Array.from(req.body)]);
  }

  if (req.body instanceof ArrayBuffer) {
    return req.body.slice(0);
  }

  if (ArrayBuffer.isView(req.body)) {
    return new Blob([
      Uint8Array.from(new Uint8Array(req.body.buffer, req.body.byteOffset, req.body.byteLength)),
    ]);
  }

  return JSON.stringify(req.body);
}

export function createProxyHandler(bunPort: number) {
  return async (req: ProxyRequest, res: ProxyResponse) => {
    try {
      const bunUrl = `http://localhost:${bunPort}${req.originalUrl || req.url}`;
      const response = await fetch(bunUrl, {
        method: req.method,
        headers: buildProxyHeaders({
          headers: req.headers,
          authUserId: req.authUserId,
          hasActiveSession: Boolean(req.activeSession),
        }),
        body: buildProxyBody(req),
      });

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      res.status(response.status);
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('[g1-teleprompter] Proxy error:', error);
      res.status(500).send('Proxy error');
    }
  };
}
