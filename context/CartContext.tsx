'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  weightOption: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, 'productName' | 'productImage'> & { productName?: string; productImage?: string }) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number, weightOption?: string) => Promise<void>;
  removeFromCart: (productId: string, weightOption?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuth();
  
  // Calculate itemCount from items
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  
  // Function to check if user is authenticated
  const checkAuth = useCallback((): boolean => {
    // If we have token in memory, user is authenticated
    if (isAuthenticated && user?._id && token) {
      return true;
    }

    // If not in browser, can't check cookies
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    try {
      // Check if authToken exists in cookies
      const hasAuthToken = document.cookie
        .split('; ')
        .some(row => row.startsWith('authToken='));

      return hasAuthToken;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }, [isAuthenticated, user?._id, token]);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || !user?._id || !token) {
      setItems([]);
      return;
    }
    
    if (isLoading) return; // Prevent multiple simultaneous refreshes

    try {
      setIsLoading(true);
      const response = await fetch(`/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for sending cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 200) {
          setItems(data.data.items || []);
        }
      } else if (response.status === 401) {
        // Handle unauthorized (e.g., token expired)
        setItems([]);
      }
    } catch (error) {
      console.error('Error refreshing cart:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?._id, token, isLoading]);

  // Initialize cart on mount and when auth state changes
  useEffect(() => {
    let isMounted = true;
    
    const initializeCart = async () => {
      if (!isMounted) return;
      
      if (checkAuth()) {
        try {
          await refreshCart();
        } catch (error) {
          console.error('Failed to initialize cart:', error);
          if (isMounted) {
            setItems([]);
            setSubtotal(0);
          }
        }
      } else {
        // Clear cart if not authenticated
        if (isMounted) {
          setItems([]);
          setSubtotal(0);
        }
      }
    };

    // Only initialize if not already loading
    if (!isLoading) {
      initializeCart();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token]); // Only depend on auth state, not functions

  const addToCart = async (item: Omit<CartItem, 'productName' | 'productImage'> & { productName?: string; productImage?: string }) => {
    // Check if user is authenticated
    if (!checkAuth()) {
      // Try to refresh the cart in case we have a valid token but stale state
      try {
        await refreshCart();
        // If refresh was successful, try adding to cart again
        if (checkAuth()) {
          return addToCart(item);
        }
      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
      
      // If we get here, user is not authenticated
      router.push('/login');
      toast.error('Please log in to add items to cart');
      return false;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity || 1,
          weightOption: item.weightOption || '',
          price: item.price,
          productName: item.productName || '',
          productImage: item.productImage || '',
        }),
      });

      if (response.status === 401) {
        // Redirect to login if not authenticated
        router.push('/login');
        toast.error('Please log in to add items to cart');
        return false;
      }

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMessage = responseData.message || 'Failed to add to cart';
        if (response.status === 404) {
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage);
      }
      
      // Show success message if we have one
      if (responseData.message) {
        toast.success(responseData.message);
      }

      await refreshCart();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number, weightOption: string = '') => {
    if (!checkAuth()) {
      router.push('/login');
      toast.error('Your session has expired. Please log in again.');
      return;
    }

    if (!isAuthenticated || !user?._id || !token) {
      if (checkAuth()) {
        await refreshCart();
        return updateQuantity(productId, quantity, weightOption);
      }
      
      router.push('/login');
      toast.error('Please log in to update cart');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Important for sending cookies
        body: JSON.stringify({
          action: 'update',
          userId: user._id,
          data: {
            productId,
            quantity,
            weightOption,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update cart');
      }

      await refreshCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Failed to update cart');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string, weightOption: string = '') => {
    if (!checkAuth()) {
      router.push('/login');
      toast.error('Your session has expired. Please log in again.');
      return;
    }

    if (!isAuthenticated || !user?._id || !token) {
      if (checkAuth()) {
        await refreshCart();
        return removeFromCart(productId, weightOption);
      }
      
      router.push('/login');
      toast.error('Please log in to update cart');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Important for sending cookies
        body: JSON.stringify({
          action: 'remove',
          userId: user._id,
          data: {
            productId,
            weightOption,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove from cart');
      }

      await refreshCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove from cart');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!checkAuthToken()) {
      router.push('/login');
      toast.error('Your session has expired. Please log in again.');
      return;
    }

    if (!isAuthenticated || !user?._id || !token) {
      if (checkAuthToken()) {
        await refreshCart();
        return clearCart();
      }
      
      router.push('/login');
      toast.error('Please log in to update cart');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Important for sending cookies
        body: JSON.stringify({
          action: 'clear',
          userId: user._id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to clear cart');
      }

      setItems([]);
      toast.success('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
