import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Address from '@/models/address';

// Helper: find address by addressId or _id
async function findAddressByIdSafe(id: string) {
    if (!id) return null;
    let address = await Address.findOne({ addressId: id });
    if (address) return address;
    try {
        address = await Address.findOne({ _id: id });
        return address;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        // Fetch all non-deleted addresses for user
        const addresses = await Address.find({ userId, isDeleted: false })
            .sort({ isDefault: -1, createdAt: -1 })
            .lean();

        return NextResponse.json(
            {
                status: 200,
                message: 'Addresses fetched successfully',
                data: addresses,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/address error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch addresses',
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
        const action = (body.action || actionQuery || 'create').toLowerCase();
        const data = body.data || body;

        // GET SINGLE ADDRESS
        if (action === 'get') {
            const id = data.id || data.addressId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Address ID is required', data: {} },
                    { status: 400 }
                );
            }

            const address = await findAddressByIdSafe(String(id));
            if (!address || address.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Address not found', data: {} },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                status: 200,
                message: 'Address fetched successfully',
                data: address,
            });
        }

        // CREATE ADDRESS
        if (action === 'create') {
            const {
                userId,
                label,
                name,
                phone,
                address,
                landmark,
                city,
                state,
                pincode,
                lat,
                lng,
                isDefault,
                email,
                country,
                addressType,
                isPrimary,
            } = data;

            // Validation
            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!name || !String(name).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Name is required', data: {} },
                    { status: 400 }
                );
            }

            if (!phone || !/^\d{10}$/.test(String(phone))) {
                return NextResponse.json(
                    { status: 400, message: 'Valid 10-digit phone number is required', data: {} },
                    { status: 400 }
                );
            }

            if (!address || !String(address).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Address is required', data: {} },
                    { status: 400 }
                );
            }

            if (!city || !String(city).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'City is required', data: {} },
                    { status: 400 }
                );
            }

            if (!pincode || !/^\d{6}$/.test(String(pincode))) {
                return NextResponse.json(
                    { status: 400, message: 'Valid 6-digit pincode is required', data: {} },
                    { status: 400 }
                );
            }

            // If this is set as default, unset other defaults for this user
            if (isDefault) {
                await Address.updateMany({ userId, isDeleted: false }, { isDefault: false });
            }

            if (isPrimary) {
                await Address.updateMany({ userId, isDeleted: false }, { isPrimary: false });
            }

            const newAddress = new Address({
                userId,
                label: label || 'Home',
                addressType: addressType || (label || 'Home'),
                name: String(name).trim(),
                phone: String(phone).trim(),
                email: email ? String(email).trim() : null,
                address: String(address).trim(),
                landmark: landmark ? String(landmark).trim() : null,
                city: String(city).trim(),
                state: String(state).trim(),
                country: country ? String(country).trim() : null,
                pincode: String(pincode).trim(),
                lat: lat ? Number(lat) : null,
                lng: lng ? Number(lng) : null,
                isDefault: Boolean(isDefault),
                isPrimary: Boolean(isPrimary),
            });

            await newAddress.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Address created successfully',
                    data: newAddress,
                },
                { status: 201 }
            );
        }

        // EDIT ADDRESS
        if (action === 'edit') {
            const id = data.id || data.addressId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Address ID is required for edit', data: {} },
                    { status: 400 }
                );
            }

            const address = await findAddressByIdSafe(String(id));
            if (!address || address.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Address not found', data: {} },
                    { status: 404 }
                );
            }

            // Update fields
            if (data.label !== undefined && ['Home', 'Work', 'Other'].includes(data.label)) {
                address.label = data.label;
            }

            if (data.addressType !== undefined && ['Home', 'Work', 'Other', 'OtherDetailed'].includes(data.addressType)) {
                address.addressType = data.addressType;
            }

            if (data.name !== undefined) {
                const trimmedName = String(data.name || '').trim();
                if (!trimmedName) {
                    return NextResponse.json(
                        { status: 400, message: 'Name cannot be empty', data: {} },
                        { status: 400 }
                    );
                }
                address.name = trimmedName;
            }

            if (data.phone !== undefined) {
                const phoneStr = String(data.phone);
                if (!/^\d{10}$/.test(phoneStr)) {
                    return NextResponse.json(
                        { status: 400, message: 'Valid 10-digit phone number is required', data: {} },
                        { status: 400 }
                    );
                }
                address.phone = phoneStr;
            }

            if (data.email !== undefined) {
                const e = data.email ? String(data.email).trim() : '';
                if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
                    return NextResponse.json({ status: 400, message: 'Invalid email address', data: {} }, { status: 400 });
                }
                address.email = e || null;
            }

            if (data.address !== undefined) {
                const trimmedAddress = String(data.address || '').trim();
                if (!trimmedAddress) {
                    return NextResponse.json(
                        { status: 400, message: 'Address cannot be empty', data: {} },
                        { status: 400 }
                    );
                }
                address.address = trimmedAddress;
            }

            if (data.landmark !== undefined) {
                address.landmark = data.landmark ? String(data.landmark).trim() : null;
            }

            if (data.city !== undefined) {
                const trimmedCity = String(data.city || '').trim();
                if (!trimmedCity) {
                    return NextResponse.json(
                        { status: 400, message: 'City cannot be empty', data: {} },
                        { status: 400 }
                    );
                }
                address.city = trimmedCity;
            }

            if (data.state !== undefined) {
                const trimmedState = String(data.state || '').trim();
                if (!trimmedState) {
                    return NextResponse.json(
                        { status: 400, message: 'State cannot be empty', data: {} },
                        { status: 400 }
                    );
                }
                address.state = trimmedState;
            }

            if (data.pincode !== undefined) {
                const pincodeStr = String(data.pincode);
                if (!/^\d{6}$/.test(pincodeStr)) {
                    return NextResponse.json(
                        { status: 400, message: 'Valid 6-digit pincode is required', data: {} },
                        { status: 400 }
                    );
                }
                address.pincode = pincodeStr;
            }

            if (data.lat !== undefined) address.lat = data.lat ? Number(data.lat) : null;
            if (data.lng !== undefined) address.lng = data.lng ? Number(data.lng) : null;

            if (data.country !== undefined) address.country = data.country ? String(data.country).trim() : null;

            // Handle default flag
            if (data.isDefault !== undefined && Boolean(data.isDefault)) {
                // Unset other defaults for this user
                await Address.updateMany(
                    { userId: address.userId, isDeleted: false, _id: { $ne: address._id } },
                    { isDefault: false }
                );
                address.isDefault = true;
            } else if (data.isDefault === false) {
                address.isDefault = false;
            }

            // Handle primary flag
            if (data.isPrimary !== undefined && Boolean(data.isPrimary)) {
                await Address.updateMany(
                    { userId: address.userId, isDeleted: false, _id: { $ne: address._id } },
                    { isPrimary: false }
                );
                address.isPrimary = true;
            } else if (data.isPrimary === false) {
                address.isPrimary = false;
            }

            await address.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Address updated successfully',
                    data: address,
                },
                { status: 200 }
            );
        }

        // DELETE ADDRESS
        if (action === 'delete') {
            const id = data.id || data.addressId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Address ID is required for delete', data: {} },
                    { status: 400 }
                );
            }

            const address = await findAddressByIdSafe(String(id));
            if (!address) {
                return NextResponse.json(
                    { status: 404, message: 'Address not found', data: {} },
                    { status: 404 }
                );
            }

            address.isDeleted = true;
            address.isDefault = false; // Remove default flag when deleting
            await address.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Address deleted successfully',
                    data: {},
                },
                { status: 200 }
            );
        }

        // SET DEFAULT ADDRESS
        if (action === 'setdefault') {
            const id = data.id || data.addressId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Address ID is required', data: {} },
                    { status: 400 }
                );
            }

            const address = await findAddressByIdSafe(String(id));
            if (!address || address.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Address not found', data: {} },
                    { status: 404 }
                );
            }

            // Unset other defaults for this user
            await Address.updateMany(
                { userId: address.userId, isDeleted: false },
                { isDefault: false }
            );

            address.isDefault = true;
            await address.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Default address set successfully',
                    data: address,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/address error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process address action',
                data: {},
            },
            { status: 500 }
        );
    }
}
