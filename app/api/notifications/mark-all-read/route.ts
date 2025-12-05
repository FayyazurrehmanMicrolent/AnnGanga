import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/notification';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { status: 400, message: 'User ID is required', data: {} },
        { status: 400 }
      );
    }

    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json(
      {
        status: 200,
        message: 'All notifications marked as read',
        data: { updatedCount: result.modifiedCount },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      {
        status: 500,
        message: error.message || 'Failed to mark all notifications as read',
        data: {},
      },
      { status: 500 }
    );
  }
}
