export function shouldStartAppServer(apiKey: string | undefined): boolean {
  return Boolean(apiKey?.trim());
}

export function buildProxyHeaders({
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
