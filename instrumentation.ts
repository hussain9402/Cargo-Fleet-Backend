export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { resetPool } = await import('./app/lib/db');
    resetPool();
    const { logStartupStatus } = await import('./app/lib/health/checks');
    await logStartupStatus();
  }
}
