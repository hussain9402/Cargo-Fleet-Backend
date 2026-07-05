import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function withCors(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function jsonResponse(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }));
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function optionsResponse() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function parseJsonBody<T>(request: NextRequest) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
