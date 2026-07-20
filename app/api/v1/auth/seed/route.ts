import { ensureAuthTables, seedDemoUser } from '@/app/lib/auth/users';
import { ensureFleetTables, linkDemoOwnData, seedCompanyFleet } from '@/app/lib/fleet/fleet';
import { errorResponse, jsonResponse } from '@/app/lib/auth/response';

export async function GET() {
  try {
    await ensureAuthTables();
    await ensureFleetTables();
    const seed = await seedDemoUser();
    if (seed?.companyId) {
      await seedCompanyFleet(seed.companyId);
      await linkDemoOwnData(seed.companyId);
    }
    return jsonResponse({
      message: 'Auth + fleet tables ready, demo data seeded with own-data links',
      demoCompanyUsers: seed?.users ?? [],
    });
  } catch (error) {
    console.error('Auth seed error:', error);
    return errorResponse('Unable to seed auth tables', 500);
  }
}
