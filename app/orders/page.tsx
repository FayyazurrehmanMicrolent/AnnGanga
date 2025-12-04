// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/context/AuthContext';
// import Link from 'next/link';

// interface OrderItem {
//     productId: string;
//     productName: string;
//     quantity: number;
//     weightOption?: string;
//     price: number;
//     total: number;
// }

// interface Order {
//     _id: string;
//     orderId: string;
//     userId: string;
//     items: OrderItem[];
//     subtotal: number;
//     discount: number;
//     deliveryCharges: number;
//     total: number;
//     couponCode?: string;
//     rewardPointsUsed: number;
//     rewardDiscount: number;
//     paymentMethod: string;
//     paymentStatus: string;
//     deliveryAddress: {
//         name: string;
//         phone: string;
//         address: string;
//         landmark?: string;
//         city: string;
//         state: string;
//         pincode: string;
//     };
//     deliveryType: string;
//     orderStatus: string;
//     estimatedDelivery?: string;
//     trackingId?: string;
//     trackingUrl?: string;
//     cancelReason?: string;
//     createdAt: string;
//     updatedAt: string;
// }

// export default function OrdersPage() {
//     const router = useRouter();
//     const { user } = useAuth();
//     const [orders, setOrders] = useState<Order[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState('');
//     const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//     const [cancelReason, setCancelReason] = useState('');
//     const [cancelling, setCancelling] = useState(false);

//     useEffect(() => {
//         if (!user) {
//             router.push('/login');
//             return;
//         }
//         fetchOrders();
//     }, [user]);

//     const fetchOrders = async () => {
//         if (!user?._id) return;
//         setLoading(true);
//         try {
//             const response = await fetch(`/api/orders?userId=${user._id}`);
//             const data = await response.json();
//             if (data.status === 200) {
//                 setOrders(data.data.orders || []);
//             } else {
//                 setError(data.message || 'Failed to fetch orders');
//             }
//         } catch (error) {
//             setError('Failed to fetch orders');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleCancelOrder = async () => {
//         if (!selectedOrder || !cancelReason.trim()) {
//             alert('Please provide a reason for cancellation');
//             return;
//         }

//         setCancelling(true);
//         try {
//             const response = await fetch('/api/orders', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     action: 'cancel',
//                     orderId: selectedOrder.orderId,
//                     reason: cancelReason,
//                 }),
//             });

//             const data = await response.json();
//             if (data.status === 200) {
//                 alert('Order cancelled successfully');
//                 setSelectedOrder(null);
//                 setCancelReason('');
//                 fetchOrders();
//             } else {
//                 alert(data.message || 'Failed to cancel order');
//             }
//         } catch (error) {
//             alert('Failed to cancel order');
//         } finally {
//             setCancelling(false);
//         }
//     };

//     const getStatusColor = (status: string) => {
//         switch (status.toLowerCase()) {
//             case 'pending':
//                 return 'bg-yellow-100 text-yellow-800';
//             case 'confirmed':
//             case 'packed':
//                 return 'bg-blue-100 text-blue-800';
//             case 'dispatched':
//                 return 'bg-purple-100 text-purple-800';
//             case 'delivered':
//                 return 'bg-green-100 text-green-800';
//             case 'cancelled':
//                 return 'bg-red-100 text-red-800';
//             default:
//                 return 'bg-gray-100 text-gray-800';
//         }
//     };

//     const canCancelOrder = (status: string) => {
//         return !['dispatched', 'delivered', 'cancelled'].includes(status.toLowerCase());
//     };

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
//                     <p className="mt-4 text-gray-800 font-medium">Loading orders...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50 pb-20">       
//             <div className="max-w-4xl mx-auto px-4 py-6">
//                 {error && (
//                     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                         {error}
//                     </div>
//                 )}

//                 {orders.length === 0 ? (
//                     <div className="bg-white rounded-xl shadow-md p-10 text-center">
//                         <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
//                             <svg
//                                 className="w-14 h-14 text-gray-400"
//                                 fill="none"
//                                 stroke="currentColor"
//                                 viewBox="0 0 24 24"
//                             >
//                                 <path
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     strokeWidth={2}
//                                     d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
//                                 />
//                             </svg>
//                         </div>
//                         <h2 className="text-2xl font-bold text-gray-900 mb-3">No orders yet</h2>
//                         <p className="text-gray-700 mb-6 text-base">Start shopping to see your orders here</p>
//                         <Link href="/products">
//                             <button className="bg-green-500 text-white px-8 py-3 rounded-xl hover:bg-green-600 font-bold text-base shadow-lg">
//                                 Start Shopping
//                             </button>
//                         </Link>
//                     </div>
//                 ) : (
//                     <div className="space-y-4">
//                         {orders.map((order) => (
//                             <div key={order.orderId || order._id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
//                                 {/* Order Header */}
//                                 <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-gray-100">
//                                     <div>
//                                         <p className="text-sm text-gray-800 font-bold">Order ID</p>
//                                         <p className="font-mono font-bold text-gray-900 text-base">{order.orderId}</p>
//                                         <p className="text-xs text-gray-700 mt-2 flex items-center font-medium">
//                                             <span className="mr-1">📅</span>
//                                             {new Date(order.createdAt).toLocaleDateString('en-IN', {
//                                                 year: 'numeric',
//                                                 month: 'long',
//                                                 day: 'numeric',
//                                             })}
//                                         </p>
//                                     </div>
//                                     <span
//                                         className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
//                                             order.orderStatus
//                                         )}`}
//                                     >
//                                         {order.orderStatus.toUpperCase()}
//                                     </span>
//                                 </div>

//                                 {/* Order Items */}
//                                 <div className="space-y-3 mb-4">
//                                     {order.items.map((item, idx) => (
//                                         <div key={`${order.orderId}-${item.productId}-${item.weightOption || 'default'}-${idx}`} className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
//                                             <span className="text-gray-800 font-medium">
//                                                 {item.productName} {item.weightOption && `(${item.weightOption})`}
//                                                 <span className="text-gray-900 ml-2 font-semibold">x {item.quantity}</span>
//                                             </span>
//                                             <span className="font-bold text-gray-900">₹{item.total}</span>
//                                         </div>
//                                     ))}
//                                 </div>

//                                 {/* Delivery Address */}
//                                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
//                                     <p className="text-sm font-bold mb-2 text-gray-900 flex items-center">
//                                         <span className="mr-2">📍</span>Delivery Address
//                                     </p>
//                                     <p className="text-sm text-gray-800 font-semibold">{order.deliveryAddress.name}</p>
//                                     <p className="text-sm text-gray-700 leading-relaxed mt-1">
//                                         {order.deliveryAddress.address}
//                                         {order.deliveryAddress.landmark && `, ${order.deliveryAddress.landmark}`}
//                                     </p>
//                                     <p className="text-sm text-gray-800 mt-1 font-medium">
//                                         {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
//                                         {order.deliveryAddress.pincode}
//                                     </p>
//                                     <p className="text-sm text-gray-700 mt-1">📞 {order.deliveryAddress.phone}</p>
//                                 </div>

//                                 {/* Order Summary */}
//                                 <div className="border-t-2 border-gray-200 pt-4 space-y-2">
//                                     <div className="flex justify-between text-sm">
//                                         <span className="text-gray-700">Subtotal</span>
//                                         <span className="font-medium text-gray-900">₹{order.subtotal}</span>
//                                     </div>
//                                     {order.discount > 0 && (
//                                         <div className="flex justify-between text-sm text-green-600">
//                                             <span className="font-medium">Discount</span>
//                                             <span className="font-bold">-₹{order.discount}</span>
//                                         </div>
//                                     )}
//                                     {order.rewardDiscount > 0 && (
//                                         <div className="flex justify-between text-sm text-green-600">
//                                             <span className="font-medium">Reward Discount ({order.rewardPointsUsed} points)</span>
//                                             <span className="font-bold">-₹{order.rewardDiscount}</span>
//                                         </div>
//                                     )}
//                                     <div className="flex justify-between text-sm">
//                                         <span className="text-gray-700">Delivery Charges</span>
//                                         <span className="font-medium text-gray-900">₹{order.deliveryCharges}</span>
//                                     </div>
//                                     <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-gray-200">
//                                         <span className="text-gray-900">Total</span>
//                                         <span className="text-green-600">₹{order.total}</span>
//                                     </div>
//                                 </div>

//                                 {/* Payment Info */}
//                                 <div className="mt-4 pt-4 border-t-2 border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
//                                     <div className="flex justify-between text-sm mb-2">
//                                         <span className="text-gray-700 font-medium">Payment Method</span>
//                                         <span className="font-bold capitalize text-gray-900">{order.paymentMethod}</span>
//                                     </div>
//                                     <div className="flex justify-between text-sm mb-2">
//                                         <span className="text-gray-700 font-medium">Payment Status</span>
//                                         <span className="font-bold capitalize text-gray-900">{order.paymentStatus}</span>
//                                     </div>
//                                     {order.estimatedDelivery && (
//                                         <div className="flex justify-between text-sm">
//                                             <span className="text-gray-700 font-medium">Expected Delivery</span>
//                                             <span className="font-bold text-gray-900">
//                                                 {new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}
//                                             </span>
//                                         </div>
//                                     )}
//                                 </div>

//                                 {/* Tracking Info */}
//                                 {order.trackingId && (
//                                     <div className="mt-3 pt-3 border-t bg-blue-50 -mx-4 -mb-4 p-4 rounded-b-lg">
//                                         <p className="text-sm font-semibold mb-1">Tracking Information</p>
//                                         <p className="text-sm text-gray-700">Tracking ID: {order.trackingId}</p>
//                                         {order.trackingUrl && (
//                                             <a
//                                                 href={order.trackingUrl}
//                                                 target="_blank"
//                                                 rel="noopener noreferrer"
//                                                 className="text-sm text-blue-600 hover:text-blue-700 underline"
//                                             >
//                                                 Track your order →
//                                             </a>
//                                         )}
//                                     </div>
//                                 )}

//                                 {/* Cancel Reason */}
//                                 {order.cancelReason && (
//                                     <div className="mt-3 pt-3 border-t bg-red-50 -mx-4 -mb-4 p-4 rounded-b-lg">
//                                         <p className="text-sm font-semibold text-red-800 mb-1">Cancellation Reason</p>
//                                         <p className="text-sm text-red-700">{order.cancelReason}</p>
//                                     </div>
//                                 )}

//                                 {/* Action Buttons */}
//                                 <div className="mt-5 flex gap-3">
//                                     {canCancelOrder(order.orderStatus) && (
//                                         <button
//                                             onClick={() => setSelectedOrder(order)}
//                                             className="flex-1 border-2 border-red-500 text-red-600 py-3 rounded-xl hover:bg-red-50 font-bold transition-all shadow-sm"
//                                         >
//                                             Cancel Order
//                                         </button>
//                                     )}
//                                     <button
//                                         onClick={() => router.push(`/products/${order.items[0]?.productId}`)}
//                                         className="flex-1 border-2 border-green-500 text-green-600 py-3 rounded-xl hover:bg-green-50 font-bold transition-all shadow-sm"
//                                     >
//                                         Reorder
//                                     </button>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>

//             {/* Cancel Order Modal */}
//             {selectedOrder && (
//                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
//                     <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
//                         <h2 className="text-2xl font-bold mb-4 text-gray-900">Cancel Order</h2>
//                         <p className="text-gray-700 mb-4 leading-relaxed">
//                             Are you sure you want to cancel order <span className="font-mono font-bold text-gray-900">{selectedOrder.orderId}</span>?
//                         </p>
//                         <textarea
//                             placeholder="Please provide a reason for cancellation"
//                             value={cancelReason}
//                             onChange={(e) => setCancelReason(e.target.value)}
//                             className="w-full border-2 border-gray-200 rounded-xl p-4 mb-4 focus:border-red-500 focus:outline-none text-gray-900"
//                             rows={4}
//                         />
//                         <div className="flex gap-3">
//                             <button
//                                 onClick={() => {
//                                     setSelectedOrder(null);
//                                     setCancelReason('');
//                                 }}
//                                 className="flex-1 border-2 border-gray-300 text-gray-800 py-3 rounded-xl hover:bg-gray-50 font-bold transition-all"
//                             >
//                                 Back
//                             </button>
//                             <button
//                                 onClick={handleCancelOrder}
//                                 disabled={cancelling || !cancelReason.trim()}
//                                 className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 disabled:bg-gray-400 font-bold transition-all shadow-lg"
//                             >
//                                 {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    weightOption?: string;
    price: number;
    total: number;
}

interface Order {
    _id: string;
    orderId: string;
    userId: string;
    items: OrderItem[];
    subtotal: number;
    discount: number;
    deliveryCharges: number;
    total: number;
    couponCode?: string;
    rewardPointsUsed: number;
    rewardDiscount: number;
    paymentMethod: string;
    paymentStatus: string;
    deliveryAddress: {
        name: string;
        phone: string;
        address: string;
        landmark?: string;
        city: string;
        state: string;
        pincode: string;
    };
    deliveryType: string;
    orderStatus: string;
    estimatedDelivery?: string;
    trackingId?: string;
    trackingUrl?: string;
    cancelReason?: string;
    createdAt: string;
    updatedAt: string;
}

export default function OrdersPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        fetchOrders();
    }, [user]);

    const fetchOrders = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/orders?userId=${user._id}`);
            const data = await response.json();
            if (data.status === 200) {
                setOrders(data.data.orders || []);
            } else {
                setError(data.message || 'Failed to fetch orders');
            }
        } catch (error) {
            setError('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason.trim()) {
            alert('Please provide a reason for cancellation');
            return;
        }
        setCancelling(true);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancel',
                    orderId: selectedOrder.orderId,
                    reason: cancelReason,
                }),
            });
            const data = await response.json();
            if (data.status === 200) {
                alert('Order cancelled successfully');
                setSelectedOrder(null);
                setCancelReason('');
                fetchOrders();
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        } catch (error) {
            alert('Failed to cancel order');
        } finally {
            setCancelling(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-yellow-700 text-black border-yellow-200';
            case 'confirmed': case 'packed': return 'bg-blue-700 text-blue-800 border-blue-200';
            case 'dispatched': return 'bg-purple-700 text-purple-800 border-purple-200';
            case 'delivered': return 'bg-green-700 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-700 text-red-800 border-red-200';
            default: return 'bg-gray-700 text-gray-800 border-gray-200';
        }
    };

    const canCancelOrder = (status: string) => {
        return !['dispatched', 'delivered', 'cancelled'].includes(status.toLowerCase());
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        

            <div className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-100">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-xl">
                            <svg className="w-14 h-14 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
                        <p className="text-gray-600 mb-8">You haven't placed any orders yet.</p>
                        <Link href="/products">
                            <button className="bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-all shadow-lg">
                                Start Shopping
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {orders.map((order) => (
                            <div key={order.orderId} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                                {/* Top Bar */}
                                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                        <div>
                                            <p className="text-xs opacity-90">Order ID</p>
                                            <p className="text-lg font-bold tracking-wider">{order.orderId}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(order.orderStatus)}`}>
                                                {order.orderStatus.toUpperCase()}
                                            </span>
                                            <p className="text-xs mt-2 opacity-90">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Items */}
                                        <div className="lg:col-span-2">
                                            <h3 className="text-base font-semibold text-gray-900 mb-3">Order Items</h3>
                                            <div className="space-y-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {item.productName} {item.weightOption && <span className="text-gray-500 text-sm">({item.weightOption})</span>}
                                                            </p>
                                                            <p className="text-sm text-gray-600">Qty: <span className="font-semibold">{item.quantity}</span></p>
                                                        </div>
                                                        <p className="text-lg font-bold text-green-600">₹{item.total}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-5">
                                            {/* Address */}
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                                                <h4 className="font-semibold text-gray-900 text-sm mb-2">Delivery Address</h4>
                                                <p className="font-medium text-gray-900 text-sm">{order.deliveryAddress.name}</p>
                                                <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                                                    {order.deliveryAddress.address}{order.deliveryAddress.landmark && `, ${order.deliveryAddress.landmark}`}<br />
                                                    {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                                                </p>
                                                <p className="text-xs text-gray-700 mt-2">Phone: {order.deliveryAddress.phone}</p>
                                            </div>

                                            {/* Price Summary */}
                                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-300">
                                                <h4 className="font-semibold text-sm mb-3">Price Details</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between"><span>Subtotal</span> <span>₹{order.subtotal}</span></div>
                                                    {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span> <span>-₹{order.discount}</span></div>}
                                                    {order.rewardDiscount > 0 && <div className="flex justify-between text-green-600"><span>Rewards</span> <span>-₹{order.rewardDiscount}</span></div>}
                                                    <div className="flex justify-between"><span>Delivery</span> <span>₹{order.deliveryCharges}</span></div>
                                                    <div className="border-t pt-2 flex justify-between font-bold text-base">
                                                        <span>Total</span>
                                                        <span className="text-green-600">₹{order.total}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Info */}
                                            <div className="text-xs space-y-1.5 bg-gray-100 p-4 rounded-lg">
                                                <div className="flex justify-between"><span className="text-gray-600">Payment</span> <span className="font-medium capitalize">{order.paymentMethod}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-600">Status</span> <span className="font-medium text-green-600 capitalize">{order.paymentStatus}</span></div>
                                                {order.estimatedDelivery && (
                                                    <div className="flex justify-between"><span className="text-gray-600">Expected</span> <span className="font-medium">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}</span></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Actions */}
                                    <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            {order.trackingId && (
                                                <div className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200 inline-block">
                                                    <span className="font-medium">Tracking ID:</span> {order.trackingId}
                                                    {order.trackingUrl && (
                                                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">Track</a>
                                                    )}
                                                </div>
                                            )}
                                            {order.cancelReason && (
                                                <div className="text-xs bg-red-50 p-3 rounded-lg border border-red-200 mt-3">
                                                    <span className="font-medium text-red-800">Cancelled:</span> <span className="text-red-700">{order.cancelReason}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 w-full sm:w-auto">
                                            {canCancelOrder(order.orderStatus) && (
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="flex-1 sm:flex-initial px-6 py-2.5 border-2 border-red-600 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/products/${order.items[0]?.productId}`)}
                                                className="flex-1 sm:flex-initial px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition shadow"
                                            >
                                                Reorder
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Order</h2>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to cancel <span className="font-mono font-bold text-red-600">{selectedOrder.orderId}</span>?
                        </p>
                        <textarea
                            placeholder="Reason for cancellation..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-4 text-sm focus:border-red-500 focus:outline-none resize-none"
                            rows={4}
                        />
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => { setSelectedOrder(null); setCancelReason(''); }}
                                className="flex-1 py-3 border border-gray-400 text-gray-800 rounded-lg font-medium hover:bg-gray-50 transition"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                disabled={cancelling || !cancelReason.trim()}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 transition"
                            >
                                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}