export const TELEPROMPTER_TOKEN_HEADER = 'x-teleprompter-token';
export const PROXIED_USER_HEADER = 'x-auth-user-id';
export const PROXIED_ACTIVE_SESSION_HEADER = 'x-has-active-session';

export async function createSetupToken(): Promise<{plainToken: string; tokenHash: string}> {
  const plainToken = Bun.randomUUIDv7();
  const tokenHash = await Bun.password.hash(plainToken);
  return {plainToken, tokenHash};
}

export async function requireBearerToken(req: Request, expectedHash: string | null | undefined): Promise<void> {
  const proxiedUserId = req.headers.get(PROXIED_USER_HEADER)?.trim();
  const hasActiveSession = req.headers.get(PROXIED_ACTIVE_SESSION_HEADER) === 'true';
  if (proxiedUserId && hasActiveSession) {
    return;
  }

  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get(TELEPROMPTER_TOKEN_HEADER);
  const token = customHeader?.trim() || authHeader?.replace(/^Bearer\s+/i, '') || '';

  if (!expectedHash || !token) {
    throw new Response('Unauthorized', {status: 401});
  }

  const valid = await Bun.password.verify(token, expectedHash);
  if (!valid) {
    throw new Response('Unauthorized', {status: 401});
  }
}
