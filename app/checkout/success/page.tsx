'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);

    useEffect(() => {
        if (!orderId) {
            router.push('/');
            return;
        }
        // Optional: Fetch order details to confirm
        setLoading(false);
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-100">
                {/* Success Icon */}
                <div className="mb-6">
                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <svg
                            className="w-16 h-16 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                </div>

                {/* Success Message */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Your order was successful!</h1>
                <p className="text-gray-700 mb-6 leading-relaxed">
                    A confirmation and invoice has been sent to your email. You'll also receive delivery updates via SMS.
                </p>

                {/* Order ID */}
                {orderId && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 mb-6 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Order ID</p>
                        <p className="text-lg font-mono font-bold text-gray-900 break-all">{orderId}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Link href="/orders" className="block w-full">
                        <button className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg text-base">
                            Track order
                        </button>
                    </Link>
                    <Link href="/" className="block w-full">
                        <button className="w-full border-2 border-gray-300 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm text-base">
                            Continue Shopping
                        </button>
                    </Link>
                </div>

                {/* Additional Info */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                        Need help? Contact our{' '}
                        <Link href="/support" className="text-green-600 hover:text-green-700 font-semibold underline">
                            customer support
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
