import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function authenticateUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        user: null, 
        error: 'Token missing hai',
      };
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return {
        authenticated: false,
        user: null,
        error: 'Token invalid ya expired hai',
      };
    }

    return {
      authenticated: true,
      user: decoded,
      error: null,
    };
  } catch (error: any) {
    return {
      authenticated: false,
      user: null,
      error: error.message,
    };
  }
}
