'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
// Using basic HTML elements instead of UI components
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
  const total = subtotal + shipping;

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
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-indigo-100 mb-4">
              <ShoppingCart className="h-12 w-12 text-indigo-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                          <ShoppingCart className="h-6 w-6 text-gray-400" />
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

                      <div className="mt-2 flex items-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.productId, item.quantity - 1, item.weightOption);
                          }}
                          className="h-8 w-8 flex items-center justify-center border border-gray-300 rounded-l-md bg-white hover:bg-gray-50"
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
                          className="w-16 text-center border-t border-b border-gray-300 h-8"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuantityChange(item.productId, item.quantity + 1, item.weightOption);
                          }}
                          className="h-8 w-8 flex items-center justify-center border border-gray-300 rounded-r-md bg-white hover:bg-gray-50"
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
              <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                <p>Subtotal</p>
                <p>₹{calculateSubtotal().toFixed(2)}</p>
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
      </div>
    </div>
  );
}