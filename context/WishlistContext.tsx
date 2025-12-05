'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

export interface WishlistItem {
  productId: string;
  title: string;
  mrp: number;
  actualPrice: number;
  images: string[];
  categoryId?: string | null;
  addedAt: Date;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated, token } = useAuth();
  
  // Calculate itemCount from items
  const itemCount = items.length;

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

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated || !user?._id || !token) {
      setItems([]);
      return;
    }
    
    if (isLoading) return; // Prevent multiple simultaneous refreshes

    try {
      setIsLoading(true);
      const response = await fetch(`/api/wishlist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
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
      console.error('Error refreshing wishlist:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?._id, token, isLoading]);

  // Initialize wishlist on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user?._id && token) {
      refreshWishlist();
    } else {
      setItems([]);
    }
  }, [isAuthenticated, user?._id, token]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: string | number): boolean => {
    if (!productId) return false;
    
    const id = String(productId).trim();
    console.log('Checking if product is in wishlist - ID:', id, 'Type:', typeof productId);
    console.log('Current wishlist items:', items);
    
    const isInList = items.some(item => {
      if (!item) return false;
      
      // Handle both string and number IDs
      const itemId = item.productId ? String(item.productId).trim() : null;
      const isMatch = itemId === id;
      
      if (isMatch) {
        console.log(`✅ Product ${id} FOUND in wishlist:`, item);
      }
      
      return isMatch;
    });
    
    if (!isInList) {
      console.log(`❌ Product ${id} NOT found in wishlist`);
    }
    
    return isInList;
  }, [items]);

  // Add item to wishlist
  const addToWishlist = useCallback(async (productId: string | number): Promise<boolean> => {
    const productIdStr = String(productId);
    console.log('addToWishlist called with ID:', productIdStr);
    
    if (!checkAuth()) {
      toast.error('Please login to add items to wishlist');
      return false;
    }

    try {
      setIsLoading(true);
      console.log('Adding to wishlist - Product ID:', productId, 'Type:', typeof productId);
      
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          productId,
          // Add additional debug info
          debug: {
            timestamp: new Date().toISOString(),
            userId: user?._id
          }
        })
      });
      
      const data = await response.json();
      console.log('Wishlist API Response:', { status: response.status, data });

      if (response.ok && data.status === 201) {
        toast.success('Added to wishlist');
        await refreshWishlist();
        return true;
      } else {
        toast.error(data.message || 'Failed to add to wishlist');
        return false;
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, token, refreshWishlist]);

  // Remove item from wishlist
  const removeFromWishlist = useCallback(async (productId: string | number): Promise<boolean> => {
    const productIdStr = String(productId);
    console.log('removeFromWishlist called with ID:', productIdStr, 'Type:', typeof productId);
    
    if (!checkAuth()) {
      toast.error('Please login to manage wishlist');
      return false;
    }

    try {
      setIsLoading(true);
      console.log('Sending DELETE request to /api/wishlist with productId:', productIdStr);
      
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          productId: productIdStr, // Ensure we're sending the string version
          debug: {
            action: 'remove',
            timestamp: new Date().toISOString(),
            userId: user?._id
          }
        }),
      });

      const data = await response.json();
      console.log('Wishlist DELETE response:', { status: response.status, data });

      if (response.ok && data.status === 200) {
        toast.success('Removed from wishlist');
        await refreshWishlist();
        return true;
      } else {
        toast.error(data.message || 'Failed to remove from wishlist');
        return false;
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth, token, refreshWishlist]);

  // Toggle wishlist - add if not present, remove if present
  const toggleWishlist = useCallback(async (productId: string | number): Promise<void> => {
    const productIdStr = String(productId);
    console.log('toggleWishlist called with ID:', productIdStr);
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount,
        isLoading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
