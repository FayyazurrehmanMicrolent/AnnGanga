
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Heart, CheckCircle, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { items: cart, updateQuantity, removeFromCart, isLoading } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isClient, setIsClient] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('selectedCoupon');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAppliedCoupon(parsed || { code: saved });
      } catch {
        setAppliedCoupon({ code: saved });
      }
    }
  }, []);

  const removeCoupon = () => {
    setAppliedCoupon(null);
    localStorage.removeItem('selectedCoupon');
    toast.success('Coupon removed');
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? (subtotal * appliedCoupon.discount) / 100
      : Math.min(appliedCoupon.discount || 0, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);

  const handleQuantity = (id: string, qty: number, weight?: string) => {
    if (qty < 1) removeFromCart(id, weight);
    else updateQuantity(id, qty, weight);
  };

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-6 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="p-2 bg-white rounded-xl shadow hover:shadow-md">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">My Cart</h1>
            {cart.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                {cart.length} items
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-xl">
              <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Cart is empty</h2>
              <p className="text-gray-600 mb-8">Add items to get started</p>
              <Link href="/" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cart Items - Compact */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.weightOption}`} className="bg-white rounded-2xl shadow-md p-4 flex gap-4 hover:shadow-lg transition">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 line-clamp-2">{item.productName}</h3>
                          {item.weightOption && <p className="text-sm text-emerald-600 font-medium">{item.weightOption}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => toggleWishlist(item.productId)} className="p-1">
                            <Heart className={`w-5 h-5 ${isInWishlist(item.productId) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                          </button>
                          <button onClick={() => removeFromCart(item.productId, item.weightOption)} className="p-1">
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Quantity + Price */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-gray-100 rounded-xl">
                          <button onClick={() => handleQuantity(item.productId, item.quantity - 1, item.weightOption)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded-l-xl">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-bold">{item.quantity}</span>
                          <button onClick={() => handleQuantity(item.productId, item.quantity + 1, item.weightOption)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded-r-xl">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xl font-bold text-emerald-600">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Summary */}
              <div className="lg:sticky lg:top-6 h-fit">
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-emerald-100">
                  <h2 className="text-xl font-bold mb-5">Order Summary</h2>

                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
                    </div>

                    {appliedCoupon ? (
                      <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-emerald-700">{appliedCoupon.code}</span>
                        </div>
                        <button onClick={removeCoupon} className="text-red-500">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push('/coupons')}
                        className="w-full py-3 bg-emerald-100 hover:bg-emerald-200 rounded-xl font-semibold text-emerald-700 flex items-center justify-center gap-2"
                      >
                        <Tag className="w-5 h-5" />
                        Apply Coupon
                      </button>
                    )}

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>You Save</span>
                        <span>₹{discount.toFixed(0)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-dashed border-emerald-200 pt-5">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xl font-bold">Total</span>
                      <span className="text-3xl font-extrabold text-emerald-600">₹{total.toFixed(0)}</span>
                    </div>

                    <button
                      onClick={() => router.push('/checkout')}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl transition"
                    >
                      Checkout Now
                    </button>

                    <div className="text-center mt-4">
                      <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
                        ← Continue Shopping
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useCart } from '@/context/CartContext';
// import { useWishlist } from '@/context/WishlistContext';
// import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Heart, CheckCircle, Tag, X } from 'lucide-react';
// import Link from 'next/link';
// import { toast } from 'react-hot-toast';

// export default function CartPage() {
//   const router = useRouter();
//   const { items: cart, updateQuantity, removeFromCart, isLoading } = useCart();
//   const { isInWishlist, toggleWishlist } = useWishlist();
//   const [isClient, setIsClient] = useState(false);
//   const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

//   useEffect(() => {
//     setIsClient(true);

//     const saved = localStorage.getItem('selectedCoupon');
//     if (saved) {
//       try {
//         const coupon = JSON.parse(saved);
//         setAppliedCoupon(coupon);
//       } catch {
//         setAppliedCoupon({ code: saved });
//       }
//     }
//   }, []);

//   const removeCoupon = () => {
//     setAppliedCoupon(null);
//     localStorage.removeItem('selectedCoupon');
//     toast.success('Coupon removed');
//   };

//   useEffect(() => {
//     const handle = (e: StorageEvent) => {
//       if (e.key === 'selectedCoupon' && e.newValue) {
//         try {
//           const coupon = JSON.parse(e.newValue!);
//           setAppliedCoupon(coupon);
//           toast.success(`Coupon ${coupon.code} applied!`, { icon: 'Success' });
//         } catch {
//           setAppliedCoupon({ code: e.newValue });
//           toast.success(`Coupon ${e.newValue} applied!`, { icon: 'Success' });
//         }
//       }
//     };
//     window.addEventListener('storage', handle);
//     return () => window.removeEventListener('storage', handle);
//   }, []);

//   const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
//   const discount = appliedCoupon
//     ? appliedCoupon.type === 'percentage'
//       ? (subtotal * appliedCoupon.discount) / 100
//       : Math.min(appliedCoupon.discount || 0, subtotal)
//     : 0;
//   const total = Math.max(0, subtotal - discount);

//   const handleQuantity = async (id: string, qty: number, weight?: string) => {
//     if (qty < 1) {
//       removeFromCart(id, weight);
//     } else {
//       updateQuantity(id, qty, weight);
//     }
//   };

//   if (!isClient || isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent"></div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
//         <div className="max-w-7xl mx-auto">

//           {/* Header */}
//           <div className="flex items-center gap-4 mb-8">
//             <button
//               onClick={() => router.back()}
//               className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition"
//             >
//               <ArrowLeft className="w-6 h-6 text-gray-700" />
//             </button>
//             <h1 className="text-4xl font-bold text-gray-900">Your Cart</h1>
//             {cart.length > 0 && (
//               <span className="ml-3 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-semibold">
//                 {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
//               </span>
//             )}
//           </div>

//           {cart.length === 0 ? (
//             /* Empty Cart */
//             <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-16 text-center max-w-2xl mx-auto border border-emerald-100">
//               <div className="w-32 h-32 bg-emerald-100 rounded-full mx-auto mb-8 flex items-center justify-center">
//                 <ShoppingCart className="w-16 h-16 text-emerald-600" />
//               </div>
//               <h2 className="text-3xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
//               <p className="text-gray-600 text-lg mb-10">Add delicious items and come back!</p>
//               <Link
//                 href="/"
//                 className="inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-10 py-5 rounded-2xl text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition"
//               >
//                 <ShoppingCart className="w-7 h-7" />
//                 Continue Shopping
//               </Link>
//             </div>
//           ) : (
//             <div className="grid lg:grid-cols-3 gap-8">
//               {/* Cart Items */}
//               <div className="lg:col-span-2 space-y-6">
//                 {cart.map((item) => (
//                   <div
//                     key={`${item.productId}-${item.weightOption || 'default'}`}
//                     className="bg-white rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100"
//                   >
//                     <div className="flex gap-5">
//                       {/* Product Image */}
//                       <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
//                         {item.productImage ? (
//                           <img
//                             src={item.productImage}
//                             alt={item.productName}
//                             className="w-full h-full object-cover"
//                           />
//                         ) : (
//                           <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
//                             <ShoppingCart className="w-12 h-12 text-gray-400" />
//                           </div>
//                         )}
//                       </div>

//                       {/* Product Info */}
//                       <div className="flex-1">
//                         <div className="flex justify-between items-start mb-3">
//                           <div>
//                             <h3 className="font-bold text-lg text-gray-900">
//                               {item.productName}
//                             </h3>
//                             {item.weightOption && (
//                               <p className="text-emerald-600 font-medium text-sm mt-1">
//                                 {item.weightOption}
//                               </p>
//                             )}
//                           </div>

//                           <div className="flex gap-3">
//                             <button
//                               onClick={() => toggleWishlist(item.productId)}
//                               className="p-2 rounded-lg hover:bg-red-50 transition"
//                             >
//                               <Heart
//                                 className={`w-6 h-6 transition-all ${
//                                   isInWishlist(item.productId)
//                                     ? 'fill-red-500 text-red-500 scale-110'
//                                     : 'text-gray-400 hover:text-red-500'
//                                 }`}
//                               />
//                             </button>
//                             <button
//                               onClick={() => removeFromCart(item.productId, item.weightOption)}
//                               className="p-2 rounded-lg hover:bg-red-50 transition"
//                             >
//                               <Trash2 className="w-6 h-6 text-red-500" />
//                             </button>
//                           </div>
//                         </div>

//                         <div className="flex items-center justify-between">
//                           <div className="flex items-center bg-gray-100 rounded-2xl overflow-hidden">
//                             <button
//                               onClick={() => handleQuantity(item.productId, item.quantity - 1, item.weightOption)}
//                               className="w-12 h-12 flex items-center justify-center hover:bg-gray-200 transition"
//                             >
//                               <Minus className="w-5 h-5" />
//                             </button>
//                             <input
//                               type="text"
//                               value={item.quantity}
//                               readOnly
//                               className="w-16 text-center font-bold text-lg bg-white"
//                             />
//                             <button
//                               onClick={() => handleQuantity(item.productId, item.quantity + 1, item.weightOption)}
//                               className="w-12 h-12 flex items-center justify-center hover:bg-gray-200 transition"
//                             >
//                               <Plus className="w-5 h-5" />
//                             </button>
//                           </div>

//                           <div className="text-right">
//                             <p className="text-2xl font-bold text-emerald-600">
//                               ₹{(item.price * item.quantity).toFixed(0)}
//                             </p>
//                             {item.quantity > 1 && (
//                               <p className="text-sm text-gray-500">
//                                 ₹{item.price} × {item.quantity}
//                               </p>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Order Summary - Sticky on Desktop */}
//               <div className="lg:sticky lg:top-8 h-fit">
//                 <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-emerald-100">
//                   <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

//                   <div className="space-y-4 mb-6">
//                     <div className="flex justify-between text-lg">
//                       <span className="text-gray-600">Subtotal</span>
//                       <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
//                     </div>

//                     {appliedCoupon && (
//                       <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
//                         <div className="flex items-center justify-between mb-2">
//                           <div className="flex items-center gap-2">
//                             <Tag className="w-5 h-5 text-emerald-600" />
//                             <span className="font-bold text-emerald-700">
//                               {appliedCoupon.code}
//                             </span>
//                             <CheckCircle className="w-5 h-5 text-emerald-600" />
//                           </div>
//                           <button
//                             onClick={removeCoupon}
//                             className="text-red-500 hover:text-red-700"
//                           >
//                             <X className="w-5 h-5" />
//                           </button>
//                         </div>
//                         {appliedCoupon.description && (
//                           <p className="text-sm text-emerald-600 mt-1">
//                             {appliedCoupon.description}
//                           </p>
//                         )}
//                         {discount > 0 && (
//                           <p className="text-right font-bold text-emerald-600 mt-3">
//                             -₹{discount.toFixed(0)} saved
//                           </p>
//                         )}
//                       </div>
//                     )}

//                     {!appliedCoupon && (
//                       <button
//                         onClick={() => router.push('/coupons')}
//                         className="w-full py-4 bg-emerald-100 hover:bg-emerald-200 rounded-2xl font-bold text-emerald-700 transition flex items-center justify-center gap-3"
//                       >
//                         <Tag className="w-rotate-90 w-6 h-6" />
//                         Apply Coupon Code
//                       </button>
//                     )}

//                     {discount > 0 && (
//                       <div className="flex justify-between text-lg font-bold text-emerald-600 pt-4 border-t-2 border-emerald-100">
//                         <span>You Save</span>
//                         <span>₹{discount.toFixed(0)}</span>
//                       </div>
//                     )}
//                   </div>

//                   <div className="border-t-4 border-dashed border-emerald-200 pt-6">
//                     <div className="flex justify-between items-center mb-8">
//                       <h3 className="text-2xl font-bold text-gray-900">Total Amount</h3>
//                       <p className="text-4xl font-extrabold text-emerald-600">
//                         ₹{total.toFixed(0)}
//                       </p>
//                     </div>

//                     <button
//                       onClick={() => router.push('/checkout')}
//                       className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xl py-5 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
//                     >
//                       Proceed to Checkout
//                     </button>

//                     <div className="mt-6 text-center">
//                       <Link
//                         href="/"
//                         className="text-emerald-600 hover:text-emerald-700 font-semibold text-lg"
//                       >
//                         ← Continue Shopping
//                       </Link>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }


// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useCart } from '@/context/CartContext';
// import { useWishlist } from '@/context/WishlistContext';
// import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, X, CheckCircle, Heart } from 'lucide-react';
// import Link from 'next/link';

// export default function CartPage() {
//   const router = useRouter();
//   const {
//     items: cart,
//     updateQuantity,
//     removeFromCart,
//     clearCart,
//     isLoading
//   } = useCart();
//   const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();
//   const [isClient, setIsClient] = useState(false);
//   const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
//   const [showSuccess, setShowSuccess] = useState(false);

//   // Load applied coupon from localStorage on component mount
//   useEffect(() => {
//     setIsClient(true);
//     const savedCoupon = localStorage.getItem('selectedCoupon');

//     if (!savedCoupon) return;

//     try {
//       // Try to parse as JSON first
//       let coupon;
//       try {
//         coupon = JSON.parse(savedCoupon);
//       } catch {
//         // If parsing fails, treat it as a simple coupon code string
//         coupon = { code: savedCoupon };
//       }

//       // Handle the case where we only have a coupon code string
//       if (typeof coupon === 'string') {
//         setAppliedCoupon({ code: coupon });
//         return;
//       }

//       // Handle the case where we have a full coupon object
//       setAppliedCoupon({
//         code: coupon.code || coupon,
//         discount: coupon.discount || 0,
//         type: coupon.type || 'fixed',
//         minPurchase: coupon.minPurchase || 0,
//         description: coupon.description || ''
//       });
//     } catch (e) {
//       console.error('Error handling saved coupon:', e);
//       localStorage.removeItem('selectedCoupon');
//     }
//   }, []);

//   const removeCoupon = () => {
//     setAppliedCoupon(null);
//     localStorage.removeItem('selectedCoupon');
//   };

//   // Listen for storage events to update coupon when changed in another tab
//   useEffect(() => {
//     const handleStorageChange = (e: StorageEvent) => {
//       if (e.key === 'selectedCoupon') {
//         if (e.newValue) {
//           setAppliedCoupon({ code: e.newValue });
//           setShowSuccess(true);
//           setTimeout(() => setShowSuccess(false), 3000);
//         } else {
//           setAppliedCoupon(null);
//         }
//       }
//     };

//     window.addEventListener('storage', handleStorageChange);
//     return () => window.removeEventListener('storage', handleStorageChange);
//   }, []);

//   const calculateDiscount = () => {
//     if (!appliedCoupon) return 0;

//     // Check if the coupon is still valid (not expired, meets minimum purchase, etc.)
//     const subtotal = calculateSubtotal();

//     if (appliedCoupon.minPurchase && subtotal < appliedCoupon.minPurchase) {
//       // Coupon no longer valid (order total decreased below minimum)
//       removeCoupon();
//       return 0;
//     }

//     if (appliedCoupon.type === 'percentage') {
//       return (subtotal * appliedCoupon.discount) / 100;
//     } else {
//       return Math.min(appliedCoupon.discount, subtotal); // Don't discount more than the order total
//     }
//   };

//   if (!isClient || isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
//       </div>
//     );
//   }

//   const calculateSubtotal = () => {
//     return cart.reduce((sum: number, item) => sum + (item.price * item.quantity), 0);
//   };

//   const subtotal = calculateSubtotal();
//   const shipping = subtotal > 0 ? 0 : 0; // Free shipping for now
//   const discount = calculateDiscount();
//   const total = Math.max(0, subtotal + shipping - discount);

//   const handleQuantityChange = async (productId: string, newQuantity: number, weightOption?: string) => {
//     if (newQuantity < 1) {
//       await removeFromCart(productId, weightOption);
//     } else {
//       await updateQuantity(productId, newQuantity, weightOption);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex items-center mb-6">
//           <button
//             onClick={() => router.back()}
//             className="text-gray-600 hover:text-gray-900 mr-4"
//           >
//             <ArrowLeft size={20} />
//           </button>
//           <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
//           {cart.length > 0 && (
//             <span className="ml-2 bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
//               {cart.length} {cart.length === 1 ? 'item' : 'items'}
//             </span>
//           )}
//         </div>

//         {cart.length === 0 ? (
//           <div className="bg-white rounded-lg shadow-sm p-8 text-center">
//             <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-4">
//               <ShoppingCart className="h-12 w-12 text-green-600" />
//             </div>
//             <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
//             <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
//             <Link
//               href="/"
//               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//             >
//               Continue Shopping
//             </Link>
//           </div>
//         ) : (
//           <div className="bg-white shadow-sm rounded-lg overflow-hidden">
//             <div className="p-4 border-b border-gray-200">
//               <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
//             </div>

//             <div className="divide-y divide-gray-200">
//               {cart.map((item) => (
//                 <div key={`${item.productId}-${item.weightOption || 'default'}`} className="p-4">
//                   <div className="flex items-start">
//                     <div className="flex-shrink-0 h-20 w-20 rounded-md overflow-hidden bg-gray-200">
//                       {item.productImage ? (
//                         <img
//                           src={item.productImage}
//                           alt={item.productName || 'Product'}
//                           className="h-full w-full object-cover"
//                         />
//                       ) : (
//                         <div className="h-full w-full bg-gray-300 flex items-center justify-center">
//                           <ShoppingCart className="h-6 w-6 text-400" />
//                         </div>
//                       )}
//                     </div>

//                     <div className="ml-4 flex-1">
//                       <div className="flex justify-between">
//                         <div>
//                           <h3 className="text-sm font-medium text-gray-900">
//                             {item.productName || 'Product'}
//                           </h3>
//                           {item.weightOption && (
//                             <p className="text-sm text-gray-500">{item.weightOption}</p>
//                           )}
//                           <p className="text-sm font-medium text-gray-900 mt-1">
//                             ₹{item.price.toFixed(2)}
//                           </p>
//                         </div>
//                         <div className="flex gap-2">
//                           <button
//                             onClick={(e) => {
//                               e.preventDefault();
//                               toggleWishlist(item.productId);
//                             }}
//                             disabled={wishlistLoading}
//                             className={`p-1 ${isInWishlist(item.productId)
//                                 ? 'text-red-500 hover:text-red-700'
//                                 : 'text-gray-400 hover:text-red-500'
//                               }`}
//                             title={isInWishlist(item.productId) ? 'Remove from wishlist' : 'Add to wishlist'}
//                           >
//                             <Heart
//                               className={`h-5 w-5 ${isInWishlist(item.productId) ? 'fill-current' : ''}`}
//                             />
//                           </button>
//                           <button
//                             onClick={(e) => {
//                               e.preventDefault();
//                               removeFromCart(item.productId, item.weightOption);
//                             }}
//                             className="text-red-500 hover:text-red-700 p-1"
//                           >
//                             <Trash2 className="h-4 w-4" />
//                           </button>
//                         </div>
//                       </div>

//                       <div className="mt-2 flex items-center">
//                         <button
//                           onClick={(e) => {
//                             e.preventDefault();
//                             handleQuantityChange(item.productId, item.quantity - 1, item.weightOption);
//                           }}
//                           className="h-8 w-8 text-black flex items-center justify-center border border-gray-300 rounded-l-md bg-white hover:bg-gray-50"
//                         >
//                           -
//                         </button>
//                         <input
//                           type="number"
//                           min="1"
//                           value={item.quantity}
//                           onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                             handleQuantityChange(
//                               item.productId,
//                               parseInt(e.target.value) || 1,
//                               item.weightOption
//                             )
//                           }
//                           className="w-16 text-black text-center border-t border-b border-gray-300 h-8"
//                         />
//                         <button
//                           onClick={(e) => {
//                             e.preventDefault();
//                             handleQuantityChange(item.productId, item.quantity + 1, item.weightOption);
//                           }}
//                           className="h-8 w-8 text-black flex items-center justify-center border border-gray-300 rounded-r-md bg-white hover:bg-gray-50"
//                         >
//                           +
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div className="p-4 border-t border-gray-200">
//               <div className="space-y-2 mb-4">
//                 <div className="flex text-black justify-between text-sm">
//                   <p>Subtotal</p>
//                   <p>₹{calculateSubtotal().toFixed(2)}</p>
//                 </div>

//                 {/* Coupon Section */}
//                 <div className="mt-2">
//                   {!appliedCoupon ? (
//                     <div className="flex items-center">
//                       <button
//                         onClick={() => router.push('/coupons')}
//                         className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
//                       >
//                         <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2m5-11a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7z" />
//                         </svg>
//                         Apply Coupon Code
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
//                       <div className="flex items-center">
//                         <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
//                         <span className="text-sm text-green-700">Coupon {appliedCoupon.code} applied</span>
//                       </div>
//                       <button
//                         onClick={removeCoupon}
//                         className="text-red-500 hover:text-red-700 text-sm"
//                       >
//                         Remove
//                       </button>
//                     </div>
//                   )}
//                 </div>

//                 {discount > 0 && (
//                   <div className="flex justify-between text-sm text-green-600">
//                     <p>Discount ({appliedCoupon?.code})</p>
//                     <p>-₹{discount.toFixed(2)}</p>
//                   </div>
//                 )}
//               </div>
//               <div className="flex justify-between text-base font-medium text-gray-900 mb-4 pt-2 border-t">
//                 <p>Total</p>
//                 <p>₹{total.toFixed(2)}</p>
//               </div>
//               <p className="text-sm text-gray-500 mb-4">
//                 Shipping and taxes calculated at checkout.
//               </p>
//               <button
//                 onClick={(e) => {
//                   e.preventDefault();
//                   router.push('/checkout');
//                 }}
//                 className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
//               >
//                 Proceed to Checkout
//               </button>
//               <div className="mt-4 flex justify-center">
//                 <Link
//                   href="/"
//                   className="text-sm font-medium text-green-600 hover:text-green-500"
//                 >
//                   Continue Shopping
//                 </Link>
//               </div>
//             </div>
//           </div>
//         )}


//         {/* Success Popup */}
//         {showSuccess && appliedCoupon && (
//           <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 z-50">
//             <CheckCircle className="h-5 w-5" />
//             <span>Coupon {appliedCoupon.code} applied successfully!</span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }