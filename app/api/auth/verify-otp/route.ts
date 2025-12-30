import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';
import Role from '@/models/roles';
import { validatePhone, generateToken } from '@/lib/auth';
import { getOtp, deleteOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { phone, otp, OTP } = body;
    const userOtp = otp || OTP;

    if (!phone) {
      return NextResponse.json({ status: 400, message: 'Phone number is required.', data: {} }, { status: 400 });
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ status: 400, message: phoneValidation.message, data: {} }, { status: 400 });
    }
    const cleanedPhone = phoneValidation.cleaned as string;

    const user = await User.findOne({ phone: cleanedPhone, isDeleted: false });
    if (!user) {
      return NextResponse.json({ status: 404, message: 'User not found.', data: {} }, { status: 404 });
    }

    if (!userOtp) {
      return NextResponse.json({ status: 400, message: 'OTP is required for verification.', data: {} }, { status: 400 });
    }

    // First check in-memory login OTPs
    const loginStored = getOtp(cleanedPhone);
    if (loginStored) {
      if (Date.now() > loginStored.expiresAt) {
        deleteOtp(cleanedPhone);
        return NextResponse.json({ status: 401, message: 'OTP has expired. Please request a new OTP.', data: {} }, { status: 401 });
      }

      if (String(userOtp) !== String(loginStored.otp)) {
        return NextResponse.json({ status: 400, message: 'Invalid OTP. Please try again.', data: {} }, { status: 400 });
      }

      // success for login OTP
      deleteOtp(cleanedPhone);
      user.lastLogin = new Date();
      await user.save();
    } else {
      // fallback to registration OTP stored on user.deviceToken
      if (!user.deviceToken) {
        return NextResponse.json({ status: 400, message: 'No OTP found for this user. Please request a new OTP.', data: {} }, { status: 400 });
      }

      if (String(user.deviceToken) !== String(userOtp)) {
        return NextResponse.json({ status: 400, message: 'Invalid OTP. Please try again.', data: {} }, { status: 400 });
      }

      // Clear deviceToken after successful verification
      user.deviceToken = null as any;
      user.lastLogin = new Date();
      await user.save();
    }

    // Build user payload
    const role = await Role.findById(user.role);
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: role?.name || 'user',
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === 'production';
    const oneWeekInSeconds = 7 * 24 * 60 * 60;

    const response = NextResponse.json(
      { status: 200, message: 'OTP verified successfully', data: { user: userData, token } },
      {
        status: 200,
        headers: {
          'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${oneWeekInSeconds}`,
        },
      }
    );

    return response;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ status: 500, message: error.message || 'OTP verification failed.', data: {} }, { status: 500 });
  }
}
