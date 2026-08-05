import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ status: 'success' }, { status: 200 });
  
  // Clear the session cookie
  response.cookies.set('__session', '', { maxAge: 0, path: '/' });
  
  return response;
}
