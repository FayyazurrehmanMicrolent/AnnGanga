'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

interface Address {
    addressId: string;
    label: string;
    name: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

interface CartItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    weightOption?: string;
    image?: string;
}

export default function CheckoutPage() {
    const router = useRouter();
const { user } = useAuth();
    const { items: cart, clearCart } = useCart();

    const [currentStep, setCurrentStep] = useState(1);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [deliveryType, setDeliveryType] = useState<'normal' | 'expedited'>('normal');
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [couponCode, setCouponCode] = useState('');
    const [rewardPoints, setRewardPoints] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState(false);

    const [showAddressForm, setShowAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        name: '',
        phone: '',
        address: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        isDefault: false,
    });

    const [couponApplied, setCouponApplied] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [appliedCouponCode, setAppliedCouponCode] = useState('');

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        fetchAddresses();
        loadAppliedCoupon();
    }, [user]);

    const loadAppliedCoupon = () => {
        const savedCoupon = localStorage.getItem('selectedCoupon');
        if (!savedCoupon) return;

        try {
            let coupon;
            try {
                coupon = JSON.parse(savedCoupon);
            } catch {
                coupon = { code: savedCoupon };
            }

            if (typeof coupon === 'string') {
                setCouponCode(coupon);
                setAppliedCouponCode(coupon);
                setCouponApplied(true);
                return;
            }

            // Calculate discount based on coupon data
            const subtotal = calculateSubtotal();
            let discount = 0;

            if (coupon.type === 'percentage') {
                discount = (subtotal * coupon.discount) / 100;
            } else {
                discount = Math.min(coupon.discount || 0, subtotal);
            }

            setCouponCode(coupon.code || '');
            setAppliedCouponCode(coupon.code || '');
            setCouponDiscount(discount);
            setCouponApplied(true);
        } catch (e) {
            console.error('Error loading saved coupon:', e);
            localStorage.removeItem('selectedCoupon');
        }
    };

    // Recalculate discount when cart changes
    useEffect(() => {
        if (couponApplied) {
            const savedCoupon = localStorage.getItem('selectedCoupon');
            if (savedCoupon) {
                try {
                    const coupon = JSON.parse(savedCoupon);
                    const subtotal = calculateSubtotal();
                    let discount = 0;

                    if (coupon.type === 'percentage') {
                        discount = (subtotal * coupon.discount) / 100;
                    } else {
                        discount = Math.min(coupon.discount || 0, subtotal);
                    }

                    setCouponDiscount(discount);
                } catch (e) {
                    console.error('Error recalculating discount:', e);
                }
            }
        }
    }, [cart]);

    const fetchAddresses = async () => {
        if (!user?._id) return;
        try {
            const response = await fetch(`/api/address?userId=${user._id}`);
            const data = await response.json();
            if (data.status === 200) {
                setAddresses(data.data);
                const defaultAddr = data.data.find((a: Address) => a.isDefault);
                if (defaultAddr) {
                    setSelectedAddress(defaultAddr.addressId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
        }
    };

    const handleAddAddress = async () => {
        if (!user?._id) return;
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    userId: user._id,
                    ...newAddress,
                }),
            });

            const data = await response.json();
            if (data.status === 201) {
                setShowAddressForm(false);
                setNewAddress({
                    label: 'Home',
                    name: '',
                    phone: '',
                    address: '',
                    landmark: '',
                    city: '',
                    state: '',
                    pincode: '',
                    isDefault: false,
                });
                fetchAddresses();
            } else {
                setError(data.message || 'Failed to add address');
            }
        } catch (error) {
            setError('Failed to add address');
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        if (!cart || cart.length === 0) return 0;
        return cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
    };

    const getDeliveryCharges = () => {
        return deliveryType === 'expedited' ? 100 : 50;
    };

    const getTotal = () => {
        const subtotal = calculateSubtotal();
        const delivery = getDeliveryCharges();
        const discount = couponApplied ? couponDiscount : 0;
        return subtotal + delivery - discount;
    };

    const applyCoupon = () => {
        if (!couponCode.trim()) {
            setError('Please enter a coupon code');
            return;
        }

        // Mock coupon validation
        const validCoupons = {
            'SAVE10': 10,
            'WELCOME20': 20,
            'FREESHIP': getDeliveryCharges(),
        };

        const discount = validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons];

        if (discount !== undefined) {
            setCouponApplied(true);
            setCouponDiscount(discount);
            setAppliedCouponCode(couponCode.toUpperCase());
            setError('');
        } else {
            setError('Invalid coupon code');
        }
    };

    const removeCoupon = () => {
        setCouponApplied(false);
        setCouponDiscount(0);
        setAppliedCouponCode('');
        setCouponCode('');
        localStorage.removeItem('selectedCoupon');
    };

    const handlePlaceOrder = async () => {
        if (!user?._id || !selectedAddress) {
            setError('Please select a delivery address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id,
                    addressId: selectedAddress,
                    paymentMethod,
                    deliveryType,
                    couponCode: appliedCouponCode || couponCode || undefined,
                    rewardPoints: rewardPoints || 0,
                }),
            });

            const data = await response.json();
            if (data.status === 201) {
                // Clear cart and coupon after successful order
                clearCart();
                localStorage.removeItem('selectedCoupon');
                setOrderSuccess(true);
                setTimeout(() => {
                    router.push(`/checkout/success?orderId=${data.data.orderId}`);
                }, 2000);
            } else {
                setError(data.message || 'Failed to place order');
            }
        } catch (error) {
            setError('Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const selectedAddressData = addresses.find((a) => a.addressId === selectedAddress);

    const StepIndicator = () => (
        <div className="max-w-4xl w-[1500px] mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-8 bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center flex-1 relative">
                        <div className="flex flex-col items-center z-10">
                            <div className={`
                                w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg
                                transition-all duration-300 ${currentStep >= step 
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200' 
                                    : 'bg-gray-100 text-gray-400'
                                } ${currentStep === step ? 'ring-4 ring-green-100 scale-110' : ''}
                            `}>
                                {currentStep > step ? '✓' : step}
                            </div>
                            <span className={`
                                text-xs mt-3 font-semibold ${currentStep >= step 
                                    ? 'text-gray-900' 
                                    : 'text-gray-500'
                                }
                            `}>
                                {step === 1 ? 'ADDRESS' : step === 2 ? 'DELIVERY' : 'PAYMENT'}
                            </span>
                        </div>
                        {step < 3 && (
                            <div className="flex-1 h-1 bg-gray-200 mx-2 absolute left-16 right-0">
                                <div className={`
                                    h-full transition-all duration-500 ${currentStep > step 
                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                        : 'bg-gray-300'
                                    }
                                `} style={{ width: currentStep > step ? '100%' : '0%' }}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
            {/* Success Modal */}
            {orderSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-scale-in">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Successful!</h3>
                            <p className="text-gray-800 text-center mb-6">Your order has been placed successfully. Redirecting...</p>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            {/* <div className="bg-white shadow-lg sticky top-0 z-20 border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-gray-900 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors group"
                        >
                            <span className="text-2xl mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                            <span className="font-medium">Back</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            Checkout
                        </h1>
                        <div className="w-20"></div> 
                    </div>
                </div>
            </div> */}

            <StepIndicator />

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4">
                {error && (
                    <div className="mb-6 animate-slide-down">
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-700 font-medium">{error}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Steps */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Step 1: Address */}
                        {currentStep === 1 && (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Shipping Address</h2>
                                            <p className="text-gray-800 text-sm mt-1">Where should we deliver your order?</p>
                                        </div>
                                        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                                            Step 1
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {addresses.length === 0 && !showAddressForm && (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                </svg>
                                            </div>
                                            <p className="text-gray-800 mb-4">No addresses saved yet</p>
                                            <button
                                                onClick={() => setShowAddressForm(true)}
                                                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                                </svg>
                                                Add New Address
                                            </button>
                                        </div>
                                    )}

                                    {/* Address Cards */}
                                    <div className="grid w-[1000px] grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {addresses.map((addr) => (
                                            <div
                                                key={addr.addressId}
                                                className={`
                                                    relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-300
                                                    hover:shadow-lg transform hover:-translate-y-1
                                                    ${selectedAddress === addr.addressId
                                                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                                                        : 'border-gray-200 hover:border-green-300'
                                                    }
                                                `}
                                                onClick={() => setSelectedAddress(addr.addressId)}
                                            >
                                                {selectedAddress === addr.addressId && (
                                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
                                                        ✓
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-3">
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center
                                                        ${selectedAddress === addr.addressId
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }
                                                    `}>
                                                        {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '🏢' : '📍'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-bold text-gray-900">{addr.name}</span>
                                                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                                                {addr.label}
                                                            </span>
                                                            {addr.isDefault && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-900 mb-1">{addr.address}</p>
                                                        <p className="text-sm text-gray-800">{addr.city}, {addr.state} - {addr.pincode}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-gray-700">📞</span>
                                                            <span className="text-sm text-gray-900">{addr.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Address Form */}
                                    {showAddressForm && (
                                        <div className="mt-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 animate-slide-up">
                                            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                                </svg>
                                                Add New Address
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Full Name *"
                                                    value={newAddress.name}
                                                    onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="Phone Number *"
                                                    value={newAddress.phone}
                                                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <textarea
                                                    placeholder="Complete Address *"
                                                    value={newAddress.address}
                                                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                                    className="md:col-span-2 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                    rows={3}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Landmark (Optional)"
                                                    value={newAddress.landmark}
                                                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="City *"
                                                    value={newAddress.city}
                                                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="State *"
                                                    value={newAddress.state}
                                                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Pincode *"
                                                    value={newAddress.pincode}
                                                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                />
                                                <select
                                                    value={newAddress.label}
                                                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value as any })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all text-black"
                                                >
                                                    <option value="Home">🏠 Home</option>
                                                    <option value="Work">🏢 Work</option>
                                                    <option value="Other">📍 Other</option>
                                                </select>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newAddress.isDefault}
                                                        onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                                        className="mr-2 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-offset-0"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">Set as default address</span>
                                                </label>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowAddressForm(false)}
                                                        className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleAddAddress}
                                                        disabled={loading}
                                                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 font-medium transition-all duration-300"
                                                    >
                                                        {loading ? 'Saving...' : 'Save Address'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!showAddressForm && addresses.length > 0 && (
                                        <button
                                            onClick={() => setShowAddressForm(true)}
                                            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-5 text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all duration-300 flex items-center justify-center gap-2 group"
                                        >
                                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                            </svg>
                                            Add New Address
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Delivery */}
                        {currentStep === 2 && (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Delivery Options</h2>
                                            <p className="text-gray-800 text-sm mt-1">Choose your preferred delivery speed</p>
                                        </div>
                                        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                                            Step 2
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div
                                            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                                deliveryType === 'normal'
                                                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                                                    : 'border-gray-200 hover:border-green-300'
                                            }`}
                                            onClick={() => setDeliveryType('normal')}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                        deliveryType === 'normal' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        🚚
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">Standard Delivery</h3>
                                                        <p className="text-sm text-gray-800 mt-1">3-4 business days</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-lg font-bold text-gray-900">₹50</span>
                                                    {deliveryType === 'normal' && (
                                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                                deliveryType === 'expedited'
                                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 shadow-lg'
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                            onClick={() => setDeliveryType('expedited')}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                        deliveryType === 'expedited' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        🚀
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">Expedited Delivery</h3>
                                                        <p className="text-sm text-gray-800 mt-1">1-2 business days</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-lg font-bold text-gray-900">₹100</span>
                                                    {deliveryType === 'expedited' && (
                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                ⚡
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">Delivery Note</h4>
                                                <p className="text-sm text-gray-800 mt-1">
                                                    Sundays & public holidays are not considered business days. 
                                                    Your delivery will be scheduled on the next available business day.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment */}
                        {currentStep === 3 && (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-slide-up">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Payment Method</h2>
                                            <p className="text-gray-800 text-sm mt-1">Select your preferred payment option</p>
                                        </div>
                                        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                                            Step 3
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="space-y-4">
                                        {/* Cash on Delivery */}
                                        <div
                                            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                                paymentMethod === 'cod'
                                                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                                                    : 'border-gray-200 hover:border-green-300'
                                            }`}
                                            onClick={() => setPaymentMethod('cod')}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                        paymentMethod === 'cod' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        💵
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">Cash on Delivery</h3>
                                                        <p className="text-sm text-gray-800 mt-1">Pay when you receive your order</p>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'cod' && (
                                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Payment */}
                                        <div
                                            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                                paymentMethod === 'card'
                                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 shadow-lg'
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                            onClick={() => setPaymentMethod('card')}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                        paymentMethod === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        💳
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">Credit/Debit Card</h3>
                                                        <p className="text-sm text-gray-800 mt-1">Visa, MasterCard, RuPay</p>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'card' && (
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* UPI Payment */}
                                        <div
                                            className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                                                paymentMethod === 'upi'
                                                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg'
                                                    : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                            onClick={() => setPaymentMethod('upi')}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                        paymentMethod === 'upi' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        📱
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">UPI Payment</h3>
                                                        <p className="text-sm text-gray-800 mt-1">Google Pay, PhonePe, Paytm</p>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'upi' && (
                                                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="lg:col-span-1 w-[400px]">
                        <div className="sticky top-24">
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
                                </div>

                                <div className="p-6">
                                    {/* Cart Items */}
                                    <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-2">
                                        {cart && cart.length > 0 ? (
                                            cart.map((item: CartItem) => (
                                                <div key={item.productId} className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-100">
                                                        <span className="text-xl">🌿</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.productName}</h4>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-700 font-medium">Qty: {item.quantity}</span>
                                                            <span className="font-bold text-gray-900 text-sm">₹{item.price * item.quantity}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-gray-800">
                                                <p className="font-medium">No items in cart</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="space-y-3 border-t border-gray-100 pt-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-800 font-medium">Subtotal</span>
                                            <span className="font-bold text-gray-900">₹{calculateSubtotal()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-800 font-medium">Delivery</span>
                                            <span className="font-bold text-gray-900">₹{getDeliveryCharges()}</span>
                                        </div>
                                        {couponApplied && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-700 font-medium">Coupon Discount</span>
                                                <span className="font-bold text-green-700">-₹{couponDiscount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-gray-200">
                                            <span className="text-gray-900">Total Amount</span>
                                            <span className="text-green-600 text-xl">₹{getTotal()}</span>
                                        </div>
                                    </div>

                                    {/* Delivery Address Preview */}
                                    {currentStep >= 2 && selectedAddressData && (
                                        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                                            <h4 className="font-bold text-gray-900 mb-2">Delivery to</h4>
                                            <div className="text-sm text-gray-600">
                                                <p className="font-medium">{selectedAddressData.name}</p>
                                                <p className="mt-1">{selectedAddressData.address}</p>
                                                <p>{selectedAddressData.city}, {selectedAddressData.state} - {selectedAddressData.pincode}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Help Section */}
                            {/* <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        ❓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Need Help?</h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Call us at <span className="font-medium text-blue-600">1800-123-4567</span> or email support@example.com
                                        </p>
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl z-20 backdrop-blur-sm bg-white/95">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex gap-3">
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1 border-2 border-gray-300 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                                Back
                            </button>
                        )}
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-600 font-medium">
                            Total: <span className="ml-2 text-lg font-bold text-green-600">₹{getTotal()}</span>
                        </div>
                    </div>
                    {currentStep < 3 ? (
                        <button
                            onClick={() => {
                                if (currentStep === 1 && !selectedAddress) {
                                    setError('Please select or add a delivery address');
                                    return;
                                }
                                setError('');
                                setCurrentStep(currentStep + 1);
                            }}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 group"
                        >
                            Continue
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Place Order & Pay
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/context/AuthContext';
// import { useCart } from '@/context/CartContext';

// interface Address {
//     addressId: string;
//     label: string;
//     name: string;
//     phone: string;
//     address: string;
//     landmark?: string;
//     city: string;
//     state: string;
//     pincode: string;
//     isDefault: boolean;
// }

// interface CartItem {
//     productId: string;
//     productName: string;
//     quantity: number;
//     price: number;
//     weightOption?: string;
// }

// export default function CheckoutPage() {
//     const router = useRouter();
//     const { user } = useAuth();
//     const { cart } = useCart();

//     const [currentStep, setCurrentStep] = useState(1);
//     const [addresses, setAddresses] = useState<Address[]>([]);
//     const [selectedAddress, setSelectedAddress] = useState<string>('');
//     const [deliveryType, setDeliveryType] = useState<'normal' | 'expedited'>('normal');
//     const [paymentMethod, setPaymentMethod] = useState('cod');
//     const [couponCode, setCouponCode] = useState('');
//     const [rewardPoints, setRewardPoints] = useState(0);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');

//     const [showAddressForm, setShowAddressForm] = useState(false);
//     const [newAddress, setNewAddress] = useState({
//         label: 'Home',
//         name: '',
//         phone: '',
//         address: '',
//         landmark: '',
//         city: '',
//         state: '',
//         pincode: '',
//         isDefault: false,
//     });

//     useEffect(() => {
//         if (!user) {
//             router.push('/login');
//             return;
//         }
//         fetchAddresses();
//     }, [user]);

//     const fetchAddresses = async () => {
//         if (!user?.id) return;
//         try {
//             const response = await fetch(`/api/address?userId=${user.id}`);
//             const data = await response.json();
//             if (data.status === 200) {
//                 setAddresses(data.data);
//                 const defaultAddr = data.data.find((a: Address) => a.isDefault);
//                 if (defaultAddr) {
//                     setSelectedAddress(defaultAddr.addressId);
//                 }
//             }
//         } catch (error) {
//             console.error('Failed to fetch addresses:', error);
//         }
//     };

//     const handleAddAddress = async () => {
//         if (!user?.id) return;
//         setLoading(true);
//         setError('');

//         try {
//             const response = await fetch('/api/address', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     action: 'create',
//                     userId: user.id,
//                     ...newAddress,
//                 }),
//             });

//             const data = await response.json();
//             if (data.status === 201) {
//                 setShowAddressForm(false);
//                 setNewAddress({
//                     label: 'Home',
//                     name: '',
//                     phone: '',
//                     address: '',
//                     landmark: '',
//                     city: '',
//                     state: '',
//                     pincode: '',
//                     isDefault: false,
//                 });
//                 fetchAddresses();
//             } else {
//                 setError(data.message || 'Failed to add address');
//             }
//         } catch (error) {
//             setError('Failed to add address');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const calculateSubtotal = () => {
//         if (!cart?.items) return 0;
//         return cart.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
//     };

//     const getDeliveryCharges = () => {
//         return deliveryType === 'expedited' ? 100 : 50;
//     };

//     const getTotal = () => {
//         return calculateSubtotal() + getDeliveryCharges();
//     };

//     const handlePlaceOrder = async () => {
//         if (!user?.id || !selectedAddress) {
//             setError('Please select a delivery address');
//             return;
//         }

//         setLoading(true);
//         setError('');

//         try {
//             const response = await fetch('/api/checkout', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     userId: user.id,
//                     addressId: selectedAddress,
//                     paymentMethod,
//                     deliveryType,
//                     couponCode: couponCode || undefined,
//                     rewardPoints: rewardPoints || 0,
//                 }),
//             });

//             const data = await response.json();
//             if (data.status === 201) {
//                 router.push(`/checkout/success?orderId=${data.data.orderId}`);
//             } else {
//                 setError(data.message || 'Failed to place order');
//             }
//         } catch (error) {
//             setError('Failed to place order');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const selectedAddressData = addresses.find((a) => a.addressId === selectedAddress);

//     return (
//         <div className="min-h-screen bg-gray-50 pb-24">
//             {/* Header */}
//             <div className="bg-white shadow-md sticky top-0 z-20 border-b">
//                 <div className="max-w-4xl mx-auto px-4 py-4">
//                     <button onClick={() => router.back()} className="flex items-center text-gray-800 hover:text-gray-600 mb-2 font-medium">
//                         <span className="text-xl mr-1">←</span> Back
//                     </button>
//                     <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
//                 </div>
//             </div>

//             {/* Progress Steps */}
//             <div className="max-w-4xl mx-auto px-4 py-6">
//                 <div className="flex items-center justify-between mb-8 bg-white rounded-lg shadow-sm p-4">
//                     <div className="flex flex-col items-center flex-1">
//                         <div
//                             className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
//                                 currentStep >= 1 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
//                             }`}
//                         >
//                             {currentStep > 1 ? '✓' : '1'}
//                         </div>
//                         <span className="text-xs mt-2 font-semibold text-gray-800">ADDRESS</span>
//                     </div>
//                     <div className="flex-1 h-0.5 bg-gray-300 mx-2">
//                         <div
//                             className={`h-full transition-all ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}
//                             style={{ width: currentStep >= 2 ? '100%' : '0%' }}
//                         ></div>
//                     </div>
//                     <div className="flex flex-col items-center flex-1">
//                         <div
//                             className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
//                                 currentStep >= 2 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
//                             }`}
//                         >
//                             {currentStep > 2 ? '✓' : '2'}
//                         </div>
//                         <span className="text-xs mt-2 font-semibold text-gray-800">DELIVERY</span>
//                     </div>
//                     <div className="flex-1 h-1 bg-gray-200 mx-2 rounded-full">
//                         <div
//                             className={`h-full transition-all rounded-full ${currentStep >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}
//                             style={{ width: currentStep >= 3 ? '100%' : '0%' }}
//                         ></div>
//                     </div>
//                     <div className="flex flex-col items-center flex-1">
//                         <div
//                             className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
//                                 currentStep >= 3 ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
//                             }`}
//                         >
//                             3
//                         </div>
//                         <span className="text-xs mt-2 font-semibold text-gray-800">PAYMENT</span>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                         {error}
//                     </div>
//                 )}

//                 {/* Step 1: Address */}
//                 {currentStep === 1 && (
//                     <div className="space-y-4">
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-6 text-gray-900">Shipping Address</h2>
                            
//                             {addresses.length === 0 && !showAddressForm && (
//                                 <p className="text-gray-600 mb-4 text-center py-4">No addresses found. Please add one.</p>
//                             )}

//                             {addresses.map((addr) => (
//                                 <div
//                                     key={addr.addressId}
//                                     className={`border-2 rounded-xl p-4 mb-3 cursor-pointer transition-all ${
//                                         selectedAddress === addr.addressId
//                                             ? 'border-green-500 bg-green-50 shadow-md'
//                                             : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                     }`}
//                                     onClick={() => setSelectedAddress(addr.addressId)}
//                                 >
//                                     <div className="flex items-start justify-between">
//                                         <div className="flex-1">
//                                             <div className="flex items-center gap-2 mb-2">
//                                                 <span className="font-bold text-gray-900 text-base">{addr.name}</span>
//                                                 <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">{addr.label}</span>
//                                                 {addr.isDefault && (
//                                                     <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Default</span>
//                                                 )}
//                                             </div>
//                                             <p className="text-sm text-gray-800 leading-relaxed">{addr.address}</p>
//                                             {addr.landmark && (
//                                                 <p className="text-sm text-gray-700 mt-1">Landmark: {addr.landmark}</p>
//                                             )}
//                                             <p className="text-sm text-gray-800 mt-1 font-medium">
//                                                 {addr.city}, {addr.state} - {addr.pincode}
//                                             </p>
//                                             <p className="text-sm text-gray-700 mt-1">📞 {addr.phone}</p>
//                                         </div>
//                                         {selectedAddress === addr.addressId && (
//                                             <div className="text-green-500 ml-2 text-2xl font-bold">✓</div>
//                                         )}
//                                     </div>
//                                     {selectedAddress === addr.addressId && (
//                                         <button
//                                             onClick={(e) => {
//                                                 e.stopPropagation();
//                                                 // Add edit functionality here
//                                             }}
//                                             className="text-sm text-green-600 mt-2"
//                                         >
//                                             Edit
//                                         </button>
//                                     )}
//                                 </div>
//                             ))}

//                             {!showAddressForm && (
//                                 <button
//                                     onClick={() => setShowAddressForm(true)}
//                                     className="w-full border-2 border-dashed border-gray-300 rounded-xl p-5 text-green-600 hover:border-green-500 hover:bg-green-50 transition-all font-semibold text-base"
//                                 >
//                                     + Add New Address
//                                 </button>
//                             )}

//                             {showAddressForm && (
//                                 <div className="border-2 border-gray-200 rounded-xl p-5 mt-4 bg-gray-50">
//                                     <h3 className="font-bold text-lg text-gray-900 mb-4">Add New Address</h3>
//                                     <div className="space-y-3">
//                                         <input
//                                             type="text"
//                                             placeholder="Full Name"
//                                             value={newAddress.name}
//                                             onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Phone Number"
//                                             value={newAddress.phone}
//                                             onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                         />
//                                         <textarea
//                                             placeholder="Address"
//                                             value={newAddress.address}
//                                             onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                             rows={3}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Landmark (Optional)"
//                                             value={newAddress.landmark}
//                                             onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                         />
//                                         <div className="grid grid-cols-2 gap-3">
//                                             <input
//                                                 type="text"
//                                                 placeholder="City"
//                                                 value={newAddress.city}
//                                                 onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
//                                                 className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                             />
//                                             <input
//                                                 type="text"
//                                                 placeholder="State"
//                                                 value={newAddress.state}
//                                                 onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
//                                                 className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                             />
//                                         </div>
//                                         <input
//                                             type="text"
//                                             placeholder="Pincode"
//                                             value={newAddress.pincode}
//                                             onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                         />
//                                         <select
//                                             value={newAddress.label}
//                                             onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value as any })}
//                                             className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
//                                         >
//                                             <option value="Home">Home</option>
//                                             <option value="Work">Work</option>
//                                             <option value="Other">Other</option>
//                                         </select>
//                                         <label className="flex items-center cursor-pointer">
//                                             <input
//                                                 type="checkbox"
//                                                 checked={newAddress.isDefault}
//                                                 onChange={(e) =>
//                                                     setNewAddress({ ...newAddress, isDefault: e.target.checked })
//                                                 }
//                                                 className="mr-2 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
//                                             />
//                                             <span className="text-sm font-medium text-gray-800">Set as default address</span>
//                                         </label>
//                                         <div className="flex gap-3">
//                                             <button
//                                                 onClick={handleAddAddress}
//                                                 disabled={loading}
//                                                 className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-semibold shadow-md transition-all"
//                                             >
//                                                 {loading ? 'Saving...' : 'Save Address'}
//                                             </button>
//                                             <button
//                                                 onClick={() => setShowAddressForm(false)}
//                                                 className="flex-1 border-2 border-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-50 font-semibold transition-all"
//                                             >
//                                                 Cancel
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* Order Summary - Step 1 */}
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-5 text-gray-900">Order Summary</h2>
//                             {cart?.items?.map((item: CartItem) => (
//                                 <div key={item.productId} className="flex justify-between text-sm mb-3">
//                                     <span className="text-gray-800">
//                                         {item.productName} <span className="text-gray-600">x {item.quantity}</span>
//                                     </span>
//                                     <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
//                                 </div>
//                             ))}
//                             <div className="border-t-2 border-gray-200 pt-3 mt-3">
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Subtotal</span>
//                                     <span className="font-medium text-gray-900">₹{calculateSubtotal()}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Shipping</span>
//                                     <span className="font-medium text-gray-900">₹{getDeliveryCharges()}</span>
//                                 </div>
//                                 <div className="flex justify-between font-bold text-xl mt-3 pt-3 border-t-2 border-gray-200">
//                                     <span className="text-gray-900">Total</span>
//                                     <span className="text-green-600">₹{getTotal()}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {/* Step 2: Delivery */}
//                 {currentStep === 2 && (
//                     <div className="space-y-4">
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-5 text-gray-900">Standard Delivery</h2>
//                             <div
//                                 className={`border-2 rounded-xl p-5 mb-4 cursor-pointer transition-all ${
//                                     deliveryType === 'normal' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                 }`}
//                                 onClick={() => setDeliveryType('normal')}
//                             >
//                                 <div className="flex items-start justify-between">
//                                     <div className="flex-1">
//                                         <div className="flex items-center gap-2 mb-2">
//                                             <span className="font-bold text-gray-900 text-base">Standard Delivery</span>
//                                             {deliveryType === 'normal' && <span className="text-green-500 text-xl font-bold">✓</span>}
//                                         </div>
//                                         <p className="text-sm text-gray-700 leading-relaxed">
//                                             Order will be delivered between 3 - 4 business days (Sundays & public holidays are not
//                                             considered).
//                                         </p>
//                                     </div>
//                                     <span className="text-green-600 font-bold text-lg ml-3">₹50</span>
//                                 </div>
//                             </div>

//                             <h2 className="text-xl font-bold mb-5 mt-6 text-gray-900">Expedited delivery</h2>
//                             <div
//                                 className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
//                                     deliveryType === 'expedited' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                 }`}
//                                 onClick={() => setDeliveryType('expedited')}
//                             >
//                                 <div className="flex items-start justify-between">
//                                     <div className="flex-1">
//                                         <div className="flex items-center gap-2 mb-2">
//                                             <span className="font-bold text-gray-900 text-base">Expedited Delivery</span>
//                                             {deliveryType === 'expedited' && <span className="text-green-500 text-xl font-bold">✓</span>}
//                                         </div>
//                                         <p className="text-sm text-gray-700 leading-relaxed">
//                                             Order will be delivered between 1-2 business days (Sundays & public holidays are not
//                                             considered).
//                                         </p>
//                                     </div>
//                                     <span className="text-green-600 font-bold text-lg ml-3">₹100</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Order Summary - Step 2 */}
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-5 text-gray-900">Order Summary</h2>
//                             {cart?.items?.map((item: CartItem) => (
//                                 <div key={item.productId} className="flex justify-between text-sm mb-3">
//                                     <span className="text-gray-800">
//                                         {item.productName} <span className="text-gray-600">x {item.quantity}</span>
//                                     </span>
//                                     <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
//                                 </div>
//                             ))}
//                             <div className="border-t-2 border-gray-200 pt-3 mt-3">
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Subtotal</span>
//                                     <span className="font-medium text-gray-900">₹{calculateSubtotal()}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Shipping</span>
//                                     <span className="font-medium text-gray-900">₹{getDeliveryCharges()}</span>
//                                 </div>
//                                 <div className="flex justify-between font-bold text-xl mt-3 pt-3 border-t-2 border-gray-200">
//                                     <span className="text-gray-900">Total</span>
//                                     <span className="text-green-600">₹{getTotal()}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {/* Step 3: Payment */}
//                 {currentStep === 3 && (
//                     <div className="space-y-4">
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-5 text-gray-900">Payment Method</h2>

//                             <div
//                                 className={`border-2 rounded-xl p-5 mb-4 cursor-pointer flex items-center transition-all ${
//                                     paymentMethod === 'cod' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                 }`}
//                                 onClick={() => setPaymentMethod('cod')}
//                             >
//                                 <div className="flex items-center justify-between w-full">
//                                     <div className="flex items-center gap-4">
//                                         <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center text-2xl shadow-sm">
//                                             💵
//                                         </div>
//                                         <span className="font-bold text-gray-900 text-base">Cash On Delivery</span>
//                                     </div>
//                                     {paymentMethod === 'cod' && <span className="text-green-500 text-2xl font-bold">✓</span>}
//                                 </div>
//                             </div>

//                             <div
//                                 className={`border-2 rounded-xl p-5 mb-4 cursor-pointer flex items-center transition-all ${
//                                     paymentMethod === 'card' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                 }`}
//                                 onClick={() => setPaymentMethod('card')}
//                             >
//                                 <div className="flex items-center justify-between w-full">
//                                     <div className="flex items-center gap-4">
//                                         <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-2xl shadow-sm">
//                                             💳
//                                         </div>
//                                         <span className="font-bold text-gray-900 text-base">Credit or Debit Card</span>
//                                     </div>
//                                     <div className="flex items-center gap-2">
//                                         {paymentMethod === 'card' && <span className="text-green-500 text-2xl font-bold">✓</span>}
//                                         <span className="text-gray-400 text-xl">→</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div
//                                 className={`border-2 rounded-xl p-5 cursor-pointer flex items-center transition-all ${
//                                     paymentMethod === 'upi' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
//                                 }`}
//                                 onClick={() => setPaymentMethod('upi')}
//                             >
//                                 <div className="flex items-center justify-between w-full">
//                                     <div className="flex items-center gap-4">
//                                         <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center text-2xl shadow-sm">
//                                             📱
//                                         </div>
//                                         <span className="font-bold text-gray-900 text-base">UPI (Pay via any app)</span>
//                                     </div>
//                                     <div className="flex items-center gap-2">
//                                         {paymentMethod === 'upi' && <span className="text-green-500 text-2xl font-bold">✓</span>}
//                                         <span className="text-gray-400 text-xl">→</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Order Summary - Step 3 */}
//                         <div className="bg-white rounded-xl shadow-md p-6">
//                             <h2 className="text-xl font-bold mb-5 text-gray-900">Order Summary</h2>
//                             {cart?.items?.map((item: CartItem) => (
//                                 <div key={item.productId} className="flex justify-between text-sm mb-3">
//                                     <span className="text-gray-800">
//                                         {item.productName} <span className="text-gray-600">x {item.quantity}</span>
//                                     </span>
//                                     <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
//                                 </div>
//                             ))}
//                             <div className="border-t-2 border-gray-200 pt-3 mt-3">
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Subtotal</span>
//                                     <span className="font-medium text-gray-900">₹{calculateSubtotal()}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mb-2">
//                                     <span className="text-gray-700">Shipping</span>
//                                     <span className="font-medium text-gray-900">₹{getDeliveryCharges()}</span>
//                                 </div>
//                                 <div className="flex justify-between font-bold text-xl mt-3 pt-3 border-t-2 border-gray-200">
//                                     <span className="text-gray-900">Total</span>
//                                     <span className="text-green-600">₹{getTotal()}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* Bottom Navigation */}
//             <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-2xl z-20">
//                 <div className="max-w-4xl mx-auto flex gap-3">
//                     {currentStep > 1 && (
//                         <button
//                             onClick={() => setCurrentStep(currentStep - 1)}
//                             className="flex-1 border-2 border-gray-300 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm text-base"
//                         >
//                             Back
//                         </button>
//                     )}
//                     {currentStep < 3 ? (
//                         <button
//                             onClick={() => {
//                                 if (currentStep === 1 && !selectedAddress) {
//                                     setError('Please select or add a delivery address');
//                                     return;
//                                 }
//                                 setError('');
//                                 setCurrentStep(currentStep + 1);
//                             }}
//                             className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg text-base"
//                         >
//                             Next
//                         </button>
//                     ) : (
//                         <button
//                             onClick={handlePlaceOrder}
//                             disabled={loading}
//                             className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 disabled:bg-gray-400 transition-all shadow-lg text-base"
//                         >
//                             {loading ? 'Processing...' : 'Make a payment'}
//                         </button>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }
