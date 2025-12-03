'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Coupon, fetchActiveCoupons } from '@/lib/api/coupons';

export default function CouponsPage() {
  const router = useRouter();
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active coupons on component mount
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const activeCoupons = await fetchActiveCoupons();
        setCoupons(activeCoupons);
      } catch (err) {
        console.error('Failed to load coupons:', err);
        setError('Failed to load coupons. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCoupons();
  }, []);

  const applyCoupon = (coupon: Coupon) => {
    // Store the selected coupon in localStorage
    localStorage.setItem('selectedCoupon', JSON.stringify({
      code: coupon.code,
      discount: coupon.discountValue,
      type: coupon.discountType,
      minPurchase: coupon.minOrderValue,
      description: coupon.description
    }));
    
    setSelectedCoupon(coupon.code);
    
    // Close the page after a short delay
    setTimeout(() => {
      router.back();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.back()} 
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Available Coupons</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-green-600 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No active coupons available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
            <div 
              key={coupon.code}
              className={`bg-white rounded-lg shadow-sm border ${
                selectedCoupon === coupon.code 
                  ? 'border-green-500 ring-2 ring-green-200' 
                  : 'border-gray-200 hover:border-green-300'
              } transition-all duration-200`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {coupon.code}
                        </h3>
                      {selectedCoupon === coupon.code && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied
                        </span>
                      )}
                    </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {coupon.description}
                    </p>
                    <div className="mt-2">
                      <span className="text-sm font-medium text-green-600">
                        {coupon.discountType === 'percentage' 
                          ? `${coupon.discountValue}% OFF` 
                          : `₹${coupon.discountValue} OFF`}
                      </span>
                      {coupon.minOrderValue > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          Min. purchase: ₹{coupon.minOrderValue}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => applyCoupon(coupon)}
                    disabled={selectedCoupon === coupon.code}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedCoupon === coupon.code
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedCoupon === coupon.code ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Coupon will be automatically applied at checkout
          </p>
        </div>
      </div>
    </div>
  );
}
