"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingCart, X, Filter, ChevronDown, ChevronUp, Heart } from 'lucide-react';

type Product = {
  id: string | number;
  name: string;
  weight: string;
  price: number;
  oldPrice: number;
  off: number;
  img: string;
  images?: string[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    sort: 'featured',
    priceRange: [0, 1000],
  });
  const [showFilters, setShowFilters] = useState(false);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/product?limit=100');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (data.status === 200) {
          const formattedProducts = data.data.map((product: any) => ({
            id: product.productId || product._id,
            name: product.title,
            weight: product.weightVsPrice?.[0]?.weight || '1 kg',
            price: product.actualPrice || 0,
            oldPrice: product.mrp || 0,
            off: product.mrp > 0 
              ? Math.round(((product.mrp - product.actualPrice) / product.mrp) * 100)
              : 0,
            img: product.images?.[0] || '/placeholder/spice.jpg',
            images: product.images || []
          }));
          setProducts(formattedProducts);
        } else {
          throw new Error(data.message || 'Failed to load products');
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const addToCartHandler = (product: Product) => {
    addToCart({
      productId: product.id.toString(),
      productName: product.name,
      productImage: product.img,
      price: product.price,
      quantity: 1,
      weightOption: product.weight
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">    
        
        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
            <div className="text-sm text-gray-500">
              {products.length} {products.length === 1 ? 'product' : 'products'} found
            </div>
          </div>
          
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/products/${product.id}`} className="block">
                    <div className="relative">
                      <img 
                        src={product.img} 
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                      {product.off > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {product.off}% OFF
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product.id.toString());
                        }}
                        disabled={wishlistLoading}
                        className={`absolute top-2 left-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-colors ${
                          isInWishlist(product.id.toString()) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                        aria-label={isInWishlist(product.id.toString()) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart size={18} className={isInWishlist(product.id.toString()) ? 'fill-current' : ''} />
                      </button>
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/products/${product.id}`} className="hover:underline">
                      <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">{product.weight}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
                        {product.oldPrice > product.price && (
                          <span className="ml-2 text-sm text-gray-500 line-through">
                            ${product.oldPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => addToCartHandler(product)}
                        className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
