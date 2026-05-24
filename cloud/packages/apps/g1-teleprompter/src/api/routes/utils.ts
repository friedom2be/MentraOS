import type {RouteDeps} from './types';

export function getNow(deps: RouteDeps): string {
  return (deps.now || (() => new Date().toISOString()))();
}

export async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({error: message}, {status: 500});
  }
}
