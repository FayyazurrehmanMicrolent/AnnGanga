import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';
import { validateEmail, validatePhone } from '@/lib/auth';

// Helper: find user by id or _id
async function findUserByIdSafe(id: string) {
    if (!id) return null;
    let user = await User.findOne({ id });
    if (user) return user;
    try {
        user = await User.findOne({ _id: id });
        return user;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const userId = params?.id;

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const user = await findUserByIdSafe(String(userId));

        if (!user || user.isDeleted) {
            return NextResponse.json(
                { status: 404, message: 'User not found', data: {} },
                { status: 404 }
            );
        }

        // TODO: Fetch order history when Order model is created
        const orderHistory = [];
        const totalOrders = 0;
        const totalSpent = 0;
        const averageOrderValue = 0;
        const lastOrderDate = null;

        return NextResponse.json(
            {
                status: 200,
                message: 'User details fetched successfully',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        dob: user.dob,
                        profileImage: user.profileImage,
                        roleId: user.roleId,
                        isActive: user.isActive,
                        isBlocked: user.isBlocked,
                        blockedAt: user.blockedAt,
                        blockedReason: user.blockedReason,
                        lastLogin: user.lastLogin,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                    stats: {
                        totalOrders,
                        totalSpent,
                        averageOrderValue,
                        lastOrderDate,
                    },
                    orderHistory, // Last 10 orders
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/admin/users/[id] error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch user details',
                data: {},
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const userId = params?.id;

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const url = new URL(req.url);
        const actionQuery = url.searchParams.get('action');

        const body = await req.json().catch(() => ({}));
        const action = (body.action || actionQuery || '').toLowerCase();
        const data = body.data || body;

        const user = await findUserByIdSafe(String(userId));

        if (!user || user.isDeleted) {
            return NextResponse.json(
                { status: 404, message: 'User not found', data: {} },
                { status: 404 }
            );
        }

        // BLOCK USER
        if (action === 'block') {
            const reason = data.reason || 'No reason provided';

            if (user.isBlocked) {
                return NextResponse.json(
                    { status: 400, message: 'User is already blocked', data: {} },
                    { status: 400 }
                );
            }

            user.isBlocked = true;
            user.blockedAt = new Date();
            user.blockedReason = String(reason).trim();

            await user.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'User blocked successfully',
                    data: {
                        id: user.id,
                        isBlocked: user.isBlocked,
                        blockedAt: user.blockedAt,
                        blockedReason: user.blockedReason,
                    },
                },
                { status: 200 }
            );
        }

        // UNBLOCK USER
        if (action === 'unblock') {
            if (!user.isBlocked) {
                return NextResponse.json(
                    { status: 400, message: 'User is not blocked', data: {} },
                    { status: 400 }
                );
            }

            user.isBlocked = false;
            user.blockedAt = null;
            user.blockedReason = null;

            await user.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'User unblocked successfully',
                    data: {
                        id: user.id,
                        isBlocked: user.isBlocked,
                    },
                },
                { status: 200 }
            );
        }

        // UPDATE USER (Admin override)
        if (action === 'update') {
            if (data.name !== undefined) {
                user.name = String(data.name || '').trim() || null;
            }

            if (data.email !== undefined) {
                const email = String(data.email || '').trim();
                if (email) {
                    if (!validateEmail(email)) {
                        return NextResponse.json(
                            { status: 400, message: 'Invalid email format', data: {} },
                            { status: 400 }
                        );
                    }
                    // Check if email already exists for another user
                    const existingUser = await User.findOne({ email, id: { $ne: user.id } });
                    if (existingUser) {
                        return NextResponse.json(
                            { status: 409, message: 'Email already in use', data: {} },
                            { status: 409 }
                        );
                    }
                    user.email = email;
                } else {
                    user.email = null;
                }
            }

            if (data.phone !== undefined) {
                const phoneValidation = validatePhone(data.phone);
                if (!phoneValidation.isValid) {
                    return NextResponse.json(
                        { status: 400, message: phoneValidation.message, data: {} },
                        { status: 400 }
                    );
                }
                // Check if phone already exists for another user
                const existingUser = await User.findOne({ phone: phoneValidation.cleaned, id: { $ne: user.id } });
                if (existingUser) {
                    return NextResponse.json(
                        { status: 409, message: 'Phone number already in use', data: {} },
                        { status: 409 }
                    );
                }
                user.phone = phoneValidation.cleaned as string;
            }

            if (data.dob !== undefined) {
                if (data.dob === null) {
                    user.dob = null;
                } else {
                    const dobDate = new Date(data.dob);
                    if (isNaN(dobDate.getTime())) {
                        return NextResponse.json(
                            { status: 400, message: 'Invalid date of birth format', data: {} },
                            { status: 400 }
                        );
                    }
                    user.dob = dobDate;
                }
            }

            await user.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'User updated successfully',
                    data: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        dob: user.dob,
                    },
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/admin/users/[id] error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process user action',
                data: {},
            },
            { status: 500 }
        );
    }
}
