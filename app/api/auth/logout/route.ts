import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Create response with cleared auth cookie
    const response = NextResponse.json(
      { status: 200, message: 'Logout successful', data: {} },
      { 
        status: 200,
        headers: {
          'Set-Cookie': `authToken=; Path=/; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`
        }
      }
    );

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { status: 500, message: error?.message || 'Logout failed', data: {} },
      { status: 500 }
    );
  }
}

export async function GET(_: NextRequest) {
  return POST(_);
}
