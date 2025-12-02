import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/notification';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        const type = url.searchParams.get('type');
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { userId };

        if (type) {
            query.type = type;
        }

        if (unreadOnly) {
            query.isRead = false;
        }

        // Get total count
        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        // Fetch notifications
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'Notifications fetched successfully',
                data: {
                    notifications,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                    },
                    unreadCount,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/notifications error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch notifications',
                data: {},
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const actionQuery = url.searchParams.get('action');

        const body = await req.json().catch(() => ({}));
        const action = (body.action || actionQuery || 'send').toLowerCase();
        const data = body.data || body;

        // SEND NOTIFICATION
        if (action === 'send') {
            const { userId, type, title, message, data: notificationData } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!type) {
                return NextResponse.json(
                    { status: 400, message: 'Notification type is required', data: {} },
                    { status: 400 }
                );
            }

            if (!title || !String(title).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Title is required', data: {} },
                    { status: 400 }
                );
            }

            if (!message || !String(message).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Message is required', data: {} },
                    { status: 400 }
                );
            }

            const validTypes = ['order', 'delivery', 'offer', 'subscription', 'reward', 'general'];
            if (!validTypes.includes(type)) {
                return NextResponse.json(
                    { status: 400, message: 'Invalid notification type', data: {} },
                    { status: 400 }
                );
            }

            const notification = new Notification({
                userId,
                type,
                title: String(title).trim(),
                message: String(message).trim(),
                data: notificationData || null,
            });

            await notification.save();

            // TODO: Send push notification
            // TODO: Send email notification

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Notification sent successfully',
                    data: notification,
                },
                { status: 201 }
            );
        }

        // MARK AS READ
        if (action === 'markread') {
            const { notificationId, userId } = data;

            if (!notificationId) {
                return NextResponse.json(
                    { status: 400, message: 'Notification ID is required', data: {} },
                    { status: 400 }
                );
            }

            const notification = await Notification.findOne({ notificationId });
            if (!notification) {
                return NextResponse.json(
                    { status: 404, message: 'Notification not found', data: {} },
                    { status: 404 }
                );
            }

            // Verify ownership if userId provided
            if (userId && notification.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'Access denied', data: {} },
                    { status: 403 }
                );
            }

            notification.isRead = true;
            await notification.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Notification marked as read',
                    data: { notificationId: notification.notificationId },
                },
                { status: 200 }
            );
        }

        // MARK ALL AS READ
        if (action === 'markallread') {
            const { userId } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            await Notification.updateMany({ userId, isRead: false }, { isRead: true });

            return NextResponse.json(
                {
                    status: 200,
                    message: 'All notifications marked as read',
                    data: {},
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/notifications error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process notification action',
                data: {},
            },
            { status: 500 }
        );
    }
}
