import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/notification';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { notificationId, isRead } = await req.json();
    
    if (!notificationId) {
      return NextResponse.json(
        { status: 400, message: 'Notification ID is required', data: {} },
        { status: 400 }
      );
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead },
      { new: true }
    );

    if (!updatedNotification) {
      return NextResponse.json(
        { status: 404, message: 'Notification not found', data: {} },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: 200,
        message: 'Notification updated successfully',
        data: { notification: updatedNotification },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      {
        status: 500,
        message: error.message || 'Failed to update notification',
        data: {},
      },
      { status: 500 }
    );
  }
}
