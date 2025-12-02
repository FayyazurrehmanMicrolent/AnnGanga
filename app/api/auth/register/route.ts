import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';
import Role from '@/models/roles';
import {
  validateEmail,
  validatePhone,
  sendEmail,
  getWelcomeEmailTemplate,
  generateDeviceToken,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, phone, name, dob } = body;

    // Generate OTP (6 random numbers) - only shown in console, not saved
    const otp = generateDeviceToken();

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

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return NextResponse.json(
        {
          status: 400,
          message: 'Invalid email format.',
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

    // Check if email already exists (only if provided)
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && !existingUser.isDeleted) {
        return NextResponse.json(
          {
            status: 409,
            message: 'Email is already registered.',
            data: {},
          },
          { status: 409 }
        );
      }
    }

    // Check if phone already exists
    // Use cleaned digit-only phone (validated) for lookups and storage
    const cleanedPhone = phoneValidation.cleaned as string;
    const existingUser = await User.findOne({ phone: cleanedPhone });
    if (existingUser && !existingUser.isDeleted) {
      return NextResponse.json(
        {
          status: 409,
          message: 'Phone number is already registered.',
          data: {},
        },
        { status: 409 }
      );
    }

    // Find default Customer role (create if missing)
    let customerRole = await Role.findOne({ role: 'Customer' });
    if (!customerRole) {
      customerRole = await Role.create({ role: 'Customer', isRoleActive: true });
    }

    // Create new user with roleId pointing to Customer.roleId
    // Save the generated OTP as the deviceToken so the DB unique index
    // for `deviceToken` does not receive `null` values.
    const newUser = new User({
      email: email || null,
      phone: cleanedPhone,
      name: name || null,
      dob: dob || null,
      roleId: customerRole.roleId,
      isActive: true,
      isDeleted: false,
      deviceToken: otp,
    });

    await newUser.save();

    // Send welcome email or log OTP
    if (email) {
      const emailTemplate = getWelcomeEmailTemplate(name || email, email, otp);
      await sendEmail(email, 'Welcome to Ann-Ganga! 🎉', emailTemplate);
    } else {
      // Log OTP in console even if no email
      console.log(`🔐 Registration OTP:\n   Phone: ${phone}\n   OTP: ${otp}`);
    }

    // Send response
    return NextResponse.json(
      {
        status: 201,
        message: 'User registration completed successfully!',
          data: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          name: newUser.name,
          roleId: newUser.roleId,
          deviceToken: newUser.deviceToken,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        status: 500,
        message: error.message || 'Registration failed. Please try again.',
        data: {},
      },
      { status: 500 }
    );
  }
}
