import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';
import Role from '@/models/roles';
import {
  validatePhone,
  generateToken,
  sendEmail,
  getLoginEmailTemplate,
  generateDeviceToken,
} from '@/lib/auth';

// In-memory store for OTPs (temporary solution - use Redis in production)
const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { phone, otp, OTP } = body;
    
    // Handle both 'otp' and 'OTP' field names
    const userOtp = otp || OTP;

    // Validation: phone is required
    if (!phone) {
      return NextResponse.json(
        {
          status: 400,
          message: 'Phone number is required.',
          data: {},
        },
        { status: 400 }
      );
    }

    // Validate phone format (returns object with message and cleaned value)
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ status: 400, message: phoneValidation.message, data: {} }, { status: 400 });
    }
    const cleanedPhone = phoneValidation.cleaned as string;

    // Check if user exists
    const user = await User.findOne({ phone: cleanedPhone, isDeleted: false });

    if (!user) {
      return NextResponse.json(
        {
          status: 401,
          message: 'User not found. Please register first.',
          data: {},
        },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          status: 403,
          message: 'Account is inactive. Please contact administrator.',
          data: {},
        },
        { status: 403 }
      );
    }

    // If OTP is not provided, generate and store it
    if (!userOtp) {
      // Static OTP for testing/development
      const generatedOtp = '123456';
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      otpStore.set(cleanedPhone, { otp: generatedOtp, expiresAt });
      
      console.log(`📱 OTP Generated for ${cleanedPhone}:\n   OTP: ${generatedOtp}`);

      return NextResponse.json(
        {
          status: 200,
          message: 'OTP sent to your phone number.',
          data: {
            phone: phone,
            message: 'Please verify with OTP',
            otp: generatedOtp, // Include OTP in response for development
          },
        },
        { status: 200 }
      );
    }

    // Verify OTP
    const storedOtpData = otpStore.get(cleanedPhone);

    if (!storedOtpData) {
      return NextResponse.json(
        {
          status: 401,
          message: 'OTP not found. Please request a new OTP.',
          data: {},
        },
        { status: 401 }
      );
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(cleanedPhone);
      return NextResponse.json(
        {
          status: 401,
          message: 'OTP has expired. Please request a new OTP.',
          data: {},
        },
        { status: 401 }
      );
    }

    // Check if OTP matches
    if (userOtp !== storedOtpData.otp) {
      return NextResponse.json(
        {
          status: 400,
          message: 'Invalid OTP. Please try again.',
          data: {},
        },
        { status: 400 }
      );
    }

    // Clear the OTP after successful verification
    otpStore.delete(cleanedPhone);
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Update user's last login
    user.lastLogin = new Date();
    await user.save();
    
    // Get user role details
    const role = await Role.findById(user.role);
    
    // Prepare user data to return (exclude sensitive info)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: role?.name || 'user',
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    // Create response and set token as an HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const oneWeekInSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
    
    const response = NextResponse.json(
      {
        status: 200,
        message: 'OTP verification successful',
        data: {
          user: userData,
          token,
        },
      },
      { 
        status: 200,
        headers: {
          'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${oneWeekInSeconds}`
        }
      }
    );

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        status: 500,
        message: error.message || 'Login failed. Please try again.',
        data: {},
      },
      { status: 500 }
    );
  }
}



// import { NextRequest, NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import User from '@/models/users';
// import Role from '@/models/roles';
// import {
//   validatePhone,
//   generateToken,
//   sendEmail,
//   getLoginEmailTemplate,
//   generateDeviceToken,
// } from '@/lib/auth';

// // In-memory store for OTPs (temporary solution - use Redis in production)
// const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

// export async function POST(req: NextRequest) {
//   try {
//     await connectDB();

//     const body = await req.json();
//     const { phone, otp, OTP } = body;
    
//     // Handle both 'otp' and 'OTP' field names
//     const userOtp = otp || OTP;

//     // Validation: phone is required
//     if (!phone) {
//       return NextResponse.json(
//         {
//           status: 400,
//           message: 'Phone number is required.',
//           data: {},
//         },
//         { status: 400 }
//       );
//     }

//     // Validate phone format (returns object with message and cleaned value)
//     const phoneValidation = validatePhone(phone);
//     if (!phoneValidation.isValid) {
//       return NextResponse.json({ status: 400, message: phoneValidation.message, data: {} }, { status: 400 });
//     }
//     const cleanedPhone = phoneValidation.cleaned as string;

//     // Check if user exists
//     const user = await User.findOne({ phone: cleanedPhone, isDeleted: false });

//     if (!user) {
//       return NextResponse.json(
//         {
//           status: 401,
//           message: 'User not found. Please register first.',
//           data: {},
//         },
//         { status: 401 }
//       );
//     }

//     // Check if user account is active
//     if (!user.isActive) {
//       return NextResponse.json(
//         {
//           status: 403,
//           message: 'Account is inactive. Please contact administrator.',
//           data: {},
//         },
//         { status: 403 }
//       );
//     }

//     // If OTP is not provided, generate and store it
//     if (!userOtp) {
//       const generatedOtp = generateDeviceToken();
//       const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
//       otpStore.set(cleanedPhone, { otp: generatedOtp, expiresAt });
      
//       console.log(`📱 OTP Generated for ${cleanedPhone}:\n   OTP: ${generatedOtp}`);

//       return NextResponse.json(
//         {
//           status: 200,
//           message: 'OTP sent to your phone number.',
//           data: {
//             phone: phone,
//             message: 'Please verify with OTP',
//             otp: generatedOtp, // Include OTP in response for development
//           },
//         },
//         { status: 200 }
//       );
//     }

//     // Verify OTP
//     const storedOtpData = otpStore.get(cleanedPhone);

//     if (!storedOtpData) {
//       return NextResponse.json(
//         {
//           status: 401,
//           message: 'OTP not found. Please request a new OTP.',
//           data: {},
//         },
//         { status: 401 }
//       );
//     }

//     // Check if OTP is expired
//     if (Date.now() > storedOtpData.expiresAt) {
//       otpStore.delete(cleanedPhone);
//       return NextResponse.json(
//         {
//           status: 401,
//           message: 'OTP has expired. Please request a new OTP.',
//           data: {},
//         },
//         { status: 401 }
//       );
//     }

//     // Check if OTP matches
//     if (userOtp !== storedOtpData.otp) {
//       return NextResponse.json(
//         {
//           status: 401,
//           message: 'Invalid OTP. Please try again.',
//           data: {},
//         },
//         { status: 401 }
//       );
//     }

//     // Clear the OTP after successful verification
//     otpStore.delete(cleanedPhone);
    
//     // Generate JWT token
//     const token = generateToken(user._id);
    
//     // Update user's last login
//     user.lastLogin = new Date();
//     await user.save();
    
//     // Get user role details
//     const role = await Role.findById(user.role);
    
//     // Prepare user data to return (exclude sensitive info)
//     const userData = {
//       _id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       role: role?.name || 'user',
//       isActive: user.isActive,
//       lastLogin: user.lastLogin,
//     };

//     // Create response and set token as an HttpOnly cookie
//     const isProduction = process.env.NODE_ENV === 'production';
//     const oneWeekInSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
    
//     const response = NextResponse.json(
//       {
//         status: 200,
//         message: 'Login successful',
//         data: {
//           user: userData,
//           token,
//         },
//       },
//       { 
//         status: 200,
//         headers: {
//           'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${oneWeekInSeconds}`
//         }
//       }
//     );

//     return response;
//   } catch (error: any) {
//     console.error('Login error:', error);
//     return NextResponse.json(
//       {
//         status: 500,
//         message: error.message || 'Login failed. Please try again.',
//         data: {},
//       },
//       { status: 500 }
//     );
//   }
// }
