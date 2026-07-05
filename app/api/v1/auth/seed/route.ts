import { errorResponse, jsonResponse } from '../lib/auth/response';
import { ensureAuthTables, seedDemoUser } from '../lib/auth/users';

export async function GET() {
  try {
    await ensureAuthTables();
    await seedDemoUser();

    return jsonResponse({
      message: 'Auth tables ready',
      demoUser: {
        email: 'demo@cargo.io',
        password: 'password123',
      },
    });
  } catch (error) {
    console.error('Auth seed error:', error);
    return errorResponse('Unable to seed auth tables', 500);
  }
}
