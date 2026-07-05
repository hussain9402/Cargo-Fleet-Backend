import { getHealthReport } from '@/app/lib/health/checks';
import { errorResponse, jsonResponse, optionsResponse } from '@/app/lib/auth/response';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const report = await getHealthReport();
    const httpStatus = report.status === 'error' ? 503 : 200;
    return jsonResponse(report, httpStatus);
  } catch (error) {
    console.error('Health check error:', error);
    return errorResponse('Health check failed', 500);
  }
}
