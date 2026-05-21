export const routes = {
  '/api/health': {
    async GET() {
      return Response.json({
        status: 'ok',
        app: 'g1-teleprompter',
        timestamp: new Date().toISOString(),
      });
    },
  },
};
