import type {AppRoutes} from './types';

export function buildHealthRoutes(): Pick<AppRoutes, '/api/health'> {
  return {
    '/api/health': {
      async GET(_req: Request) {
        return Response.json({
          status: 'ok',
          app: 'g1-teleprompter',
          timestamp: new Date().toISOString(),
        });
      },
    },
  };
}
