'use client';

import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WishlistPage() {
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Empty wishlist state
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your Wishlist is Empty</h2>
          <p className="text-gray-600 mb-6">
            Start adding items to your wishli st to save them for later!
          </p>
          <Link href="/products">
            <Button className="bg-green-600 hover:bg-green-700">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = async (productId: string, title: string, price: number, image: string) => {
    await addToCart({
      productId,
      quantity: 1,
      price,
      weightOption: 'Standard',
      productName: title,
      productImage: image,
    });
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
  };

  return (
    <div className="container mx-auto px-4 py-8">

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <Link href={`/products/${item.productId}`}>
              <div className="relative aspect-square bg-gray-100">
                {item.images && item.images.length > 0 ? (
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-2">
              <Link href={`/products/${item.productId}`}>
                <h3 className="font-semibold text-gray-900 text-xs mb-1 hover:text-green-600 line-clamp-2 min-h-[32px]">
                  {item.title}
                </h3>
              </Link>

              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">₹{item.actualPrice.toFixed(2)}</span>
                  {item.mrp > item.actualPrice && (
                    <span className="text-xs text-gray-500 line-through">₹{item.mrp.toFixed(2)}</span>
                  )}
                </div>
                {item.mrp > item.actualPrice && (
                  <span className="text-[11px] rounded bg-red-500 text-white font-medium inline-block px-1">
                    {Math.round((1 - item.actualPrice / item.mrp) * 100)}% off
                  </span>
                )}
              </div>

              <Button
                onClick={() => handleAddToCart(item.productId, item.title, item.actualPrice, item.images[0])}
                className="w-full bg-green-600 hover:bg-green-700 text-xs py-2 h-9 font-medium"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Add to Cart
              </Button>
              
              <Button
                onClick={() => handleRemove(item.productId)}
                variant="outline"
                size="sm"
                className="w-full mt-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-9 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
