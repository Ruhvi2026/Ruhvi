import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ status: 'success' }, { status: 200 });

  // Clear the session cookie with same domain settings
  response.cookies.set('__session', '', {
    maxAge: 0,
    path: '/',
    ...(isProduction ? { domain: '.ruhvi.in' } : {}),
  });

  return response;
}
