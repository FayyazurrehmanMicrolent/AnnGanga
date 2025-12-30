import { NextResponse } from 'next/server';

export function POST() {
  return NextResponse.json(
    { status: 410, message: 'Deprecated. Use /api/auth/verify-otp for both registration and login OTP verification.', data: {} },
    { status: 410 }
  );
}
