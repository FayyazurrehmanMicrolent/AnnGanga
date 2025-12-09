import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/users';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      // If no token in header, try to get from cookie
      const cookieToken = req.cookies.get('authToken')?.value;
      if (!cookieToken) {
        return NextResponse.json(
          { status: 401, message: 'No authentication token provided', data: {} },
          { status: 401 }
        );
      }
      
      // Verify the token from cookie
      const decoded = verifyToken(cookieToken);
      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          { status: 401, message: 'Invalid or expired token', data: {} },
          { status: 401 }
        );
      }
      
      // Fetch user data
      const user = await User.findById(decoded.userId).select('-password -otp -otpExpiry -__v');
      if (!user) {
        return NextResponse.json(
          { status: 404, message: 'User not found', data: {} },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        status: 200,
        message: 'User data retrieved successfully',
        data: { user }
      });
    }
    
    // Verify the token from Authorization header
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { status: 401, message: 'Invalid or expired token', data: {} },
        { status: 401 }
      );
    }
    
    // Fetch user data
    const user = await User.findById(decoded.userId).select('-password -otp -otpExpiry -__v');
    if (!user) {
      return NextResponse.json(
        { status: 404, message: 'User not found', data: {} },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: 200,
      message: 'User data retrieved successfully',
      data: { user }
    });
    
  } catch (error: any) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { status: 500, message: error.message || 'Internal server error', data: {} },
      { status: 500 }
    );
  }
}
