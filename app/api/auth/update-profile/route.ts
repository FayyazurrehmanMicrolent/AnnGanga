import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken, validateEmail } from '@/lib/auth';
import { saveUpload } from '@/lib/upload';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Get content type from headers
    const contentType = req.headers.get('content-type') || '';
    let parsedBody: any = {};
    let formData: FormData | null = null;

    // Parse the request body based on content type
    if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
      formData = await req.formData();
      const dataField = formData.get('data');
      if (dataField) {
        try {
          parsedBody = typeof dataField === 'string' ? JSON.parse(dataField) : JSON.parse(await dataField.text());
        } catch (e) {
          console.error('Error parsing form data:', e);
        }
      }
    } else if (contentType.includes('application/json')) {
      try {
        parsedBody = await req.json();
      } catch (e) {
        console.error('Error parsing JSON body:', e);
      }
    }

    // Authenticate via Authorization header first
    let authResult = await authenticateUser(req);

    // If authenticateUser failed, try cookie token fallback
    if (!authResult.authenticated) {
      try {
        const token = req.cookies.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            authResult = { authenticated: true, user: decoded, error: null } as any;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { status: 401, message: 'Authentication failed. Please provide valid token.', data: {} },
        { status: 401 }
      );
    }

    // Get user ID from auth result or parsed body
    let userId = (
      authResult.user?.userId || 
      authResult.user?.user_id || 
      authResult.user?.id ||
      parsedBody.userId
    );

    if (!userId) {
      return NextResponse.json(
        { status: 400, message: 'User ID is required', data: {} },
        { status: 400 }
      );
    }

    // Process the update data
    const updateData: any = {};
    const allowedFields = ['name', 'email', 'phone', 'address', 'dob'];

    // Get data from both parsed body and form data
    const requestData = { ...parsedBody };
    
    // Add direct form fields if available
    if (formData) {
      for (const key of allowedFields) {
        const value = formData.get(key);
        if (value !== null) {
          requestData[key] = String(value);
        }
      }
    }

    // Process file upload if any
    if (formData) {
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const file = value as File;
          if (file.size > 0) {
            try {
              const savedPath = await saveUpload(file, 'profile-images', userId);
              if (savedPath) {
                updateData.profileImage = savedPath;
              }
            } catch (error) {
              console.error('Error uploading file:', error);
            }
          }
        }
      }
    }

    // Process the update
    for (const key of allowedFields) {
      if (requestData[key] !== undefined) {
        updateData[key] = requestData[key];
      }
    }

    // Validate email if provided
    if (updateData.email && !validateEmail(updateData.email)) {
      return NextResponse.json(
        { status: 400, message: 'Invalid email format.', data: {} },
        { status: 400 }
      );
    }

    // Check if email is being updated and if it's already in use
    if (updateData.email) {
      const existingUser = await User.findOne({ email: updateData.email.toLowerCase() });
      if (existingUser && String(existingUser._id) !== String(userId)) {
        return NextResponse.json(
          { status: 409, message: 'Email already in use by another account.', data: {} },
          { status: 409 }
        );
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Format date of birth if provided
    if (updateData.dob) {
      const date = new Date(updateData.dob);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { status: 400, message: 'Invalid date of birth format.', data: {} },
          { status: 400 }
        );
      }
      updateData.dob = date;
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { status: 404, message: 'User not found.', data: {} },
        { status: 404 }
      );
    }

    // Prepare response
    const responsePayload = {
      id: updatedUser._id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      name: updatedUser.name,
      address: updatedUser.address,
      dob: updatedUser.dob,
      profileImage: (updatedUser as any).profileImage || null,
      lastLogin: (updatedUser as any).lastLogin,
    };

    return NextResponse.json({
      status: 200,
      message: 'Profile updated successfully.',
      data: responsePayload
    }, { status: 200 });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { status: 500, message: error.message || 'Profile update failed.', data: {} },
      { status: 500 }
    );
  }
}
