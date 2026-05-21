export async function createSetupToken(): Promise<{plainToken: string; tokenHash: string}> {
  const plainToken = Bun.randomUUIDv7();
  const tokenHash = await Bun.password.hash(plainToken);
  return {plainToken, tokenHash};
}

export async function requireBearerToken(req: Request, expectedHash: string | null | undefined): Promise<void> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || '';

  if (!expectedHash || !token) {
    throw new Response('Unauthorized', {status: 401});
  }

  const valid = await Bun.password.verify(token, expectedHash);
  if (!valid) {
    throw new Response('Unauthorized', {status: 401});
  }
}
