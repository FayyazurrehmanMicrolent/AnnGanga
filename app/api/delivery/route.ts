import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        // Static delivery options — adjust prices/ETAs as needed
        const deliveryOptions = [
            {
                id: 'normal',
                name: 'Normal Delivery',
                price: 0,
                currency: 'INR',
                estimatedDays: '5-7',
                description: 'Standard delivery with no extra charge',
            },
            {
                id: 'expected',
                name: 'Expected Delivery',
                price: 49,
                currency: 'INR',
                estimatedDays: '2-3',
                description: 'Faster delivery for a small fee',
            },
        ];

        return NextResponse.json(
            {
                status: 200,
                message: 'Delivery options fetched successfully',
                data: {
                    options: deliveryOptions,
                    defaultOption: 'normal',
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/delivery error:', error);
        return NextResponse.json(
            { status: 500, message: error?.message || 'Failed to fetch delivery options', data: {} },
            { status: 500 }
        );
    }
}
