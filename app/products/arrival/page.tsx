"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, Heart, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Product = {
  _id: string;
  productId: string;
  title: string;
  name?: string;
  actualPrice: number;
  mrp: number;
  images: string[];
  weightVsPrice?: Array<{ weight: string; price: number }>;
  tags?: string[];
};

export default function ArrivalProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();

  useEffect(() => {
    const fetchArrivalProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/product?tag=arrival');
        const data = await response.json();
        
        if (data.status === 200) {
          // Extract arrival products from the response
          let arrivalProducts: Product[] = [];
          
          // Handle structure: tags: { arrival: [...] }
          if (data.data && data.data.tags && Array.isArray(data.data.tags.arrival)) {
            arrivalProducts = data.data.tags.arrival;
          }
          
          setProducts(arrivalProducts);
          
          if (arrivalProducts.length === 0) {
            setError('No new arrival products available at the moment.');
          }
        } else {
          throw new Error(data.message || 'Failed to fetch arrival products');
        }
      } catch (err) {
        console.error('Error fetching arrival products:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchArrivalProducts();
  }, []);

  const addToCartHandler = async (product: Product) => {
    try {
      const weight = product.weightVsPrice?.[0]?.weight || '1 kg';
      const image = product.images?.[0] || '/images/placeholder-product.png';
      
      await addToCart({
        productId: product._id,
        quantity: 1,
        price: product.actualPrice,
        weightOption: weight,
        productName: product.title || product.name || 'Product',
        productImage: image,
      });
      
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlistToggle = async (productId: string) => {
    try {
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link 
            href="/"
            className="text-green-600 hover:text-green-700 font-medium inline-flex items-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">New Arrivals</h1>
          <p className="text-gray-600">
            Check out our latest products ({products.length} products)
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No new arrival products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {products.map((product) => {
              const weight = product.weightVsPrice?.[0]?.weight || '1 kg';
              const price = product.actualPrice || 0;
              const mrp = product.mrp || price;
              const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
              const image = product.images?.[0] || '/images/placeholder-product.png';
              const inWishlist = isInWishlist(product._id);

              return (
                <div 
                  key={product._id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/products/${product._id}`} className="block">
                    <div className="relative">
                      <img 
                        src={image}
                        alt={product.title || product.name || 'Product'}
                        className="w-full h-48 object-cover"
                      />
                      {off > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {off}% OFF
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleWishlistToggle(product._id);
                        }}
                        disabled={wishlistLoading}
                        className={`absolute top-2 left-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-colors ${
                          inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
                      </button>
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/products/${product._id}`} className="hover:underline">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                        {product.title || product.name || 'Product'}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">{weight}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-900">₹{price.toFixed(2)}</span>
                        {mrp > price && (
                          <span className="ml-2 text-sm text-gray-500 line-through">
                            ₹{mrp.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => addToCartHandler(product)}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
