import { errorResponse, jsonResponse } from '@/app/lib/auth/response';
import { ensureAuthTables, seedDemoUser } from '@/app/lib/auth/users';
import { ensureFleetTables, seedCompanyFleet } from '@/app/lib/fleet/fleet';

export async function GET() {
  try {
    await ensureAuthTables();
    await ensureFleetTables();
    const seed = await seedDemoUser();
    if (seed?.companyId) {
      await seedCompanyFleet(seed.companyId);
    }

    return jsonResponse({
      message: 'Auth + fleet tables ready, demo data seeded',
      password: 'password123',
      superAdmin: 'superadmin@cargo.io',
      demoCompanyUsers: seed?.users ?? [],
    });
  } catch (error) {
    console.error('Auth seed error:', error);
    return errorResponse('Unable to seed auth tables', 500);
  }
}
