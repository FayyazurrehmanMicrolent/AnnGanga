'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, X, CheckCircle, Heart } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const {
    items: cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    isLoading
  } = useCart();
  const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();
  const [isClient, setIsClient] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load applied coupon from localStorage on component mount
  useEffect(() => {
    setIsClient(true);
    const savedCoupon = localStorage.getItem('selectedCoupon');

    if (!savedCoupon) return;

    try {
      // Try to parse as JSON first
      let coupon;
      try {
        coupon = JSON.parse(savedCoupon);
      } catch {
        // If parsing fails, treat it as a simple coupon code string
        coupon = { code: savedCoupon };
      }

      // Handle the case where we only have a coupon code string
      if (typeof coupon === 'string') {
        setAppliedCoupon({ code: coupon });
        return;
      }

      // Handle the case where we have a full coupon object
      setAppliedCoupon({
        code: coupon.code || coupon,
        discount: coupon.discount || 0,
        type: coupon.type || 'fixed',
        minPurchase: coupon.minPurchase || 0,
        description: coupon.description || ''
      });
    } catch (e) {
      console.error('Error handling saved coupon:', e);
      localStorage.removeItem('selectedCoupon');
    }
  }, []);

  const removeCoupon = () => {
    setAppliedCoupon(null);
    localStorage.removeItem('selectedCoupon');
  };

  // Listen for storage events to update coupon when changed in another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedCoupon') {
        if (e.newValue) {
          setAppliedCoupon({ code: e.newValue });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } else {
          setAppliedCoupon(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;

    // Check if the coupon is still valid (not expired, meets minimum purchase, etc.)
    const subtotal = calculateSubtotal();

    if (appliedCoupon.minPurchase && subtotal < appliedCoupon.minPurchase) {
      // Coupon no longer valid (order total decreased below minimum)
      removeCoupon();
      return 0;
    }

    if (appliedCoupon.type === 'percentage') {
      return (subtotal * appliedCoupon.discount) / 100;
    } else {
      return Math.min(appliedCoupon.discount, subtotal); // Don't discount more than the order total
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum: number, item) => sum + (item.price * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 0 ? 0 : 0; // Free shipping for now
  const discount = calculateDiscount();
  const total = Math.max(0, subtotal + shipping - discount);

  const handleQuantityChange = async (productId: string, newQuantity: number, weightOption?: string) => {
    if (newQuantity < 1) {
      await removeFromCart(productId, weightOption);
    } else {
      await updateQuantity(productId, newQuantity, weightOption);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          {cart.length > 0 && (
            <span className="ml-2 bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-4">
              <ShoppingCart className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
            </div>

            <div className="divide-y divide-gray-200">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.weightOption || 'default'}`} className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-20 w-20 rounded-md overflow-hidden bg-gray-200">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName || 'Product'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-400" />
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {item.productName || 'Product'}
                          </h3>
                          {item.weightOption && (
                            <p className="text-sm text-gray-500">{item.weightOption}</p>
                          )}
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            ₹{item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleWishlist(item.productId);
                            }}
                            disabled={wishlistLoading}
                            className={`p-1 ${isInWishlist(item.productId)
                                ? 'text-red-500 hover:text-red-700'
                                : 'text-gray-400 hover:text-red-500'
                              }`}
                            title={isInWishlist(item.productId) ? 'Remove from wishlist' : 'Add to wishlist'}
                          >
                            <Heart
                              className={`h-5 w-5 ${isInWishlist(item.productId) ? 'fill-current' : ''}`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              removeFromCart(item.productId, item.weightOption);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.productId, item.quantity - 1, item.weightOption);
                          }}
                          className="h-8 w-8 text-black flex items-center justify-center border border-gray-300 rounded-l-md bg-white hover:bg-gray-50"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleQuantityChange(
                              item.productId,
                              parseInt(e.target.value) || 1,
                              item.weightOption
                            )
                          }
                          className="w-16 text-black text-center border-t border-b border-gray-300 h-8"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.productId, item.quantity + 1, item.weightOption);
                          }}
                          className="h-8 w-8 text-black flex items-center justify-center border border-gray-300 rounded-r-md bg-white hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="space-y-2 mb-4">
                <div className="flex text-black justify-between text-sm">
                  <p>Subtotal</p>
                  <p>₹{calculateSubtotal().toFixed(2)}</p>
                </div>

                {/* Coupon Section */}
                <div className="mt-2">
                  {!appliedCoupon ? (
                    <div className="flex items-center">
                      <button
                        onClick={() => router.push('/coupons')}
                        className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2m5-11a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7z" />
                        </svg>
                        Apply Coupon Code
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-700">Coupon {appliedCoupon.code} applied</span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <p>Discount ({appliedCoupon?.code})</p>
                    <p>-₹{discount.toFixed(2)}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-base font-medium text-gray-900 mb-4 pt-2 border-t">
                <p>Total</p>
                <p>₹{total.toFixed(2)}</p>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Shipping and taxes calculated at checkout.
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/checkout');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
              >
                Proceed to Checkout
              </button>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/"
                  className="text-sm font-medium text-green-600 hover:text-green-500"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}


        {/* Success Popup */}
        {showSuccess && appliedCoupon && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 z-50">
            <CheckCircle className="h-5 w-5" />
            <span>Coupon {appliedCoupon.code} applied successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}