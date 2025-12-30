'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Star, Heart, Share2, ArrowLeft, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Truck, Shield, RefreshCw, Check, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import RatingStars from '@/components/RatingStars';

type Product = {
  _id: string;
  productId: string;
  title: string;
  mrp: number;
  actualPrice: number;
  weightVsPrice: Array<{
    weight: string;
    price: number;
    quantity: number;
  }>;
  nutrition: Array<{
    weight: string;
    info: string;
  }>;
  vitamins: string[];
  tags: string[];
  delivery: string[];
  dietary: string[];
  healthBenefits: string;
  description: string;
  images: string[];
  categoryId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  reviewCount?: number;
  details?: string;
};

export default function ProductDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [faqs, setFaqs] = useState<Array<{
    _id: string;
    productId: string;
    question: string;
    answer: string;
    isDeleted: boolean;
    faqId: string;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setScale(s => Math.min(s + 0.5, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const resetZoom = () => setScale(1);

  // Reset zoom when changing images
  useEffect(() => {
    resetZoom();
  }, [selectedImageIndex]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.id) return;
      
      try {
        setLoading(true);
        const productResponse = await fetch(`/api/product/${params.id}`);
        if (!productResponse.ok) {
          throw new Error('Failed to fetch product');
        }
        const productData = await productResponse.json();
        
        if (productData.status === 200 && productData.data) {
          const product = productData.data;
          setProduct(product);
          
          if (product.weightVsPrice?.length > 0) {
            setSelectedWeight(0);
          }
          
          fetchFaqs(product);
        } else {
          throw new Error('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);
  
  // Function to fetch FAQs
  const fetchFaqs = async (product: Product) => {
    if (!product) return;
    
    try {
      const productId = product._id || product.productId;
      if (!productId) return;
      
      const response = await fetch(`/api/product/${productId}/faq`);
      if (response.ok) {
        const result = await response.json();
        const faqsData = Array.isArray(result) 
          ? result 
          : (result.data || []);
        setFaqs(faqsData);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    }
  };
  
  const toggleFaq = (faqId: string) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleAddToCart = async () => {
    if (!product) return;
    
    const selectedVariant = product.weightVsPrice[selectedWeight];
    const productId = product._id;
    
    const success = await addToCart({
      productId,
      quantity,
      price: selectedVariant?.price || product.actualPrice,
      weightOption: selectedVariant?.weight || 'N/A',
      productName: product.title,
      productImage: product.images?.[0] || '/placeholder-product.jpg',
    });
    
    if (!success) {
      const selectedVariant = product.weightVsPrice?.[selectedWeight];
      const isOutOfStock = !selectedVariant?.quantity || selectedVariant.quantity <= 0;
      
      if (isOutOfStock) {
        toast.error('This product is currently out of stock');
      } else {
        toast.error('Failed to add product to cart. Please try again.');
      }
    } else {
      toast.success('Product added to cart!');
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    const productId = product._id;
    await toggleWishlist(productId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-green-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/products">
            <Button className="bg-green-600 hover:bg-green-700 px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const discountPercentage = product.mrp > product.actualPrice 
    ? Math.round((1 - product.actualPrice / product.mrp) * 100) 
    : 0;
  const selectedVariant = product.weightVsPrice?.[selectedWeight];
  const isOutOfStock = !selectedVariant?.quantity || selectedVariant.quantity <= 0;

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/products">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </Link>
        </div>

        {/* Main Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Product Images - Left Column */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Main Image Container */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-white p-8">
                {product.images?.[selectedImageIndex] ? (
                  <>
                    {/* Badge */}
                    {discountPercentage > 0 && (
                      <div className="absolute top-4 left-4 z-20">
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                          {discountPercentage}% OFF
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                      <button 
                        onClick={handleWishlistToggle}
                        disabled={wishlistLoading}
                        className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
                        aria-label="Add to wishlist"
                      >
                        <Heart 
                          className={`w-5 h-5 transition-colors ${isInWishlist(product._id) ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                        />
                      </button>
                      <button 
                        className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
                        aria-label="Share"
                      >
                        <Share2 className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    
                    {/* Zoom Controls */}
                    {/* <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2">
                      <button 
                        onClick={zoomOut}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                        {Math.round(scale * 100)}%
                      </span>
                      <button 
                        onClick={zoomIn}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="w-4 h-4 text-gray-700" />
                      </button>
                    </div> */}
                    
                    {/* Main Image */}
                    <div 
                      ref={containerRef}
                      className="w-[800px] h-[800px] flex items-center justify-center cursor-zoom-in"
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <Image
                        src={product.images[selectedImageIndex]}
                        alt={`${product.title} - ${selectedImageIndex + 1}`}
                        width={800}
                        height={800}
                        className="w-[800px] h-[800px] object-contain drop-shadow-xl"
                        priority
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No image available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {product.images && product.images.length > 1 && (
                <div className="p-4 border-t bg-gray-50/50">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {product.images.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImageIndex(i)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3 transition-all duration-300 relative ${
                          selectedImageIndex === i 
                            ? 'border-green-500 shadow-lg scale-105' 
                            : 'border-transparent hover:border-gray-300 hover:shadow'
                        }`}
                      >
                        {img ? (
                          <>
                            <Image
                              src={img}
                              alt={`${product.title} ${i + 1}`}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                            {selectedImageIndex === i && (
                              <div className="absolute inset-0 bg-green-500/10 border-2 border-green-500 rounded-xl" />
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl">
                            <span className="text-gray-400 text-xs">Image {i + 1}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Info - Right Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-8">
              {/* Product Header */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                    {product.categoryId || 'Product'}
                  </span>
                  {isOutOfStock ? (
                    <span className="px-3 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-full">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      In Stock
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {product.title}
                </h1>
                
                {/* Rating */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center">
                    <div className="flex items-center bg-gray-900 text-white px-3 py-1.5 rounded-xl">
                      <Star className="w-5 h-5 fill-current" />
                      <span className="ml-1 font-bold">{product.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                    <span className="ml-3 text-sm text-gray-600">
                      {product.reviewCount || 0} {product.reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ₹{product.actualPrice.toFixed(2)}
                  </span>
                  {product.mrp > product.actualPrice && (
                    <>
                      <span className="text-xl text-gray-500 line-through">
                        ₹{product.mrp.toFixed(2)}
                      </span>
                      <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold rounded-full">
                        Save ₹{(product.mrp - product.actualPrice).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Savings Message */}
                {discountPercentage > 0 && (
                  <p className="text-green-700 font-medium">
                    🎉 You're saving {discountPercentage}% on this item!
                  </p>
                )}
              </div>

              {/* Weight Variants */}
              {product.weightVsPrice?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Package Size</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {product.weightVsPrice.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedWeight(index)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          selectedWeight === index
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-lg font-bold mb-1 ${
                            selectedWeight === index ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            {variant.weight}
                          </div>
                          <div className="text-gray-600">₹{variant.price.toFixed(2)}</div>
                          {variant.quantity <= 0 && (
                            <div className="text-xs text-red-600 mt-1">Out of Stock</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                <div className="flex items-center">
                  <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <button
                      onClick={decrementQuantity}
                      className="px-6 py-4 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="px-8 py-4 border-x text-lg font-bold text-gray-900 min-w-[80px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
                      className="px-6 py-4 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="ml-4 text-sm text-gray-600">
                    Only {selectedVariant?.quantity || 0} items left!
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || wishlistLoading}
                    className={`h-14 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all ${
                      isOutOfStock
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    disabled={isOutOfStock}
                    className="h-14 rounded-xl text-lg font-bold border-2 hover:bg-gray-50"
                  >
                    Buy Now
                  </Button>
                </div>
                
                {/* Trust Badges */}
                <div className="flex flex-wrap gap-4 pt-6 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="w-5 h-5 text-green-600" />
                    <span>Free Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span>100% Authentic</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    <span>Easy Returns</span>
                  </div>
                </div>
              </div>

              {/* Health Benefits */}
              {product.healthBenefits && (
                <div className="bg-blue-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">✨ Health Benefits</h3>
                  <p className="text-blue-800">{product.healthBenefits}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mb-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {['description', 'nutrition', 'vitamins', 'dietary'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 font-medium text-sm border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white rounded-2xl shadow-sm mt-6 p-8">
            {activeTab === 'description' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Product Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
                {product.details && (
                  <div className="mt-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4">Details</h4>
                    <p className="text-gray-700 whitespace-pre-line">{product.details}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'nutrition' && product.nutrition?.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Nutritional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {product.nutrition.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6">
                      <div className="text-lg font-bold text-gray-900 mb-2">{item.weight}</div>
                      <p className="text-gray-700">{item.info}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'vitamins' && product.vitamins?.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Vitamins & Minerals</h3>
                <div className="flex flex-wrap gap-3">
                  {product.vitamins.map((vitamin, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-800 rounded-full font-medium"
                    >
                      {vitamin}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dietary' && product.dietary?.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Dietary Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {product.dietary.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequently Bought Together Section */}
        {Array.isArray((product as any).more) && (product as any).more[0]?.frequentlyBoughtTogether?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Bought Together</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {((product as any).more[0].frequentlyBoughtTogether as any[]).map((p: any) => {
                const price = p.actualPrice ?? p.price ?? 0;
                const firstVariant = p.weightVsPrice && p.weightVsPrice.length ? p.weightVsPrice[0] : null;
                const displayPrice = firstVariant ? firstVariant.price : price;
                const image = p.images && p.images.length ? p.images[0] : '/placeholder-product.jpg';
                return (
                  <div key={p._id || p.productId} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image src={image} alt={p.title} width={96} height={96} className="object-contain" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                        <div className="text-sm text-gray-600 mt-1">{p.weight || (firstVariant && firstVariant.weight) || ''}</div>
                        <div className="mt-2 flex items-baseline gap-3">
                          <span className="text-lg font-bold">₹{displayPrice.toFixed(2)}</span>
                          {p.mrp > (p.actualPrice ?? 0) && (
                            <span className="text-sm text-gray-500 line-through">₹{(p.mrp || 0).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={async () => {
                              const success = await addToCart({
                                productId: p._id,
                                quantity: 1,
                                price: displayPrice,
                                weightOption: (firstVariant && firstVariant.weight) || p.weight || '',
                                productName: p.title,
                                productImage: image,
                              });
                              if (success) toast.success('Added to cart');
                              else toast.error('Failed to add');
                            }}
                            className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {faqs.map((faq, index) => (
                <div key={faq._id || faq.faqId} className={`${index !== faqs.length - 1 ? 'border-b' : ''}`}>
                  <button
                    className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => toggleFaq(faq.faqId || faq._id)}
                    aria-expanded={expandedFaq === (faq.faqId || faq._id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-lg font-bold">
                        Q{index + 1}
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                    </div>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                        expandedFaq === (faq.faqId || faq._id) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === (faq.faqId || faq._id) && (
                    <div className="px-6 pb-6 pl-16">
                      <div className="bg-green-50 rounded-xl p-6">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-900 text-white px-4 py-2 rounded-xl">
                  <Star className="w-6 h-6 fill-current mr-2" />
                  <span className="text-2xl font-bold">{product.rating?.toFixed(1) || '5.0'}</span>
                </div>
                <span className="text-gray-600">
                  Based on {product.reviewCount || 0} {product.reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
            
            {user ? (
              <Button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 px-8 rounded-xl font-bold"
              >
                {showReviewForm ? 'Cancel Review' : 'Write a Review'}
              </Button>
            ) : (
              <Link href="/login">
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 px-8 rounded-xl font-bold">
                  Login to Write Review
                </Button>
              </Link>
            )}
          </div>

          {showReviewForm && user && (
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Write Your Review</h3>
                <ReviewForm
                  productId={product.productId}
                  userId={user.id || user._id || ''}
                  onSuccess={() => {
                    setShowReviewForm(false);
                    setReviewRefresh(prev => prev + 1);
                    toast.success('Review submitted successfully!');
                  }}
                />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-8">
            <ReviewList 
              productId={product.productId} 
              refreshTrigger={reviewRefresh}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg lg:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">₹{product.actualPrice.toFixed(2)}</span>
              {product.mrp > product.actualPrice && (
                <span className="text-sm text-gray-500 line-through">₹{product.mrp.toFixed(2)}</span>
              )}
            </div>
            <Button 
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold"
            >
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


// 'use client';

// import Image from 'next/image';
// import { Button } from '@/components/ui/button';
// import { Minus, Plus, Star, Heart, Share2, ArrowLeft, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react';
// import Link from 'next/link';
// import { useState, useEffect, useRef } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { useCart } from '@/context/CartContext';
// import { useWishlist } from '@/context/WishlistContext';
// import { useAuth } from '@/context/AuthContext';
// import { toast } from 'react-hot-toast';
// import ReviewList from '@/components/ReviewList';
// import ReviewForm from '@/components/ReviewForm';
// import RatingStars from '@/components/RatingStars';

// type Product = {
//   _id: string;
//   productId: string; // Add productId field
//   title: string;
//   mrp: number;
//   actualPrice: number;
//   weightVsPrice: Array<{
//     weight: string;
//     price: number;
//     quantity: number;
//   }>;
//   nutrition: Array<{
//     weight: string;
//     info: string;
//   }>;
//   vitamins: string[];
//   tags: string[];
//   delivery: string[];
//   dietary: string[];
//   healthBenefits: string;
//   description: string;
//   images: string[];
//   categoryId: string;
//   isDeleted: boolean;
//   createdAt: string;
//   updatedAt: string;
//   rating?: number; // Make optional since it might not always be present
//   reviewCount?: number; // Make optional
//   details?: string; // Make optional
// };

// export default function ProductDetails() {
//   // All hooks must be called unconditionally at the top level
//   const params = useParams();
//   const router = useRouter();
//   const { user } = useAuth();
//   const [product, setProduct] = useState<Product | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedWeight, setSelectedWeight] = useState(0);
//   const [faqs, setFaqs] = useState<Array<{
//     _id: string;
//     productId: string;
//     question: string;
//     answer: string;
//     isDeleted: boolean;
//     faqId: string;
//     createdAt: string;
//     updatedAt: string;
//   }>>([]);
//   const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
//   const [quantity, setQuantity] = useState(1);
//   const [activeTab, setActiveCard] = useState('description');
//   const [selectedImageIndex, setSelectedImageIndex] = useState(0);
//   const [scale, setScale] = useState(1);
//   const [showReviewForm, setShowReviewForm] = useState(false);
//   const [reviewRefresh, setReviewRefresh] = useState(0);
//   const { addToCart } = useCart();
//   const { isInWishlist, toggleWishlist, isLoading: wishlistLoading } = useWishlist();
//   const imgRef = useRef<HTMLImageElement>(null);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const zoomIn = () => setScale(s => Math.min(s + 0.5, 3));
//   const zoomOut = () => setScale(s => Math.max(s - 0.5, 1));
//   const resetZoom = () => setScale(1);

//   // Reset zoom when changing images
//   useEffect(() => {
//     resetZoom();
//   }, [selectedImageIndex]);

//   // Fetch product data
//   useEffect(() => {
//     const fetchProduct = async () => {
//       if (!params?.id) return;
      
//       try {
//         setLoading(true);
//         // Fetch the specific product
//         const productResponse = await fetch(`/api/product/${params.id}`);
//         if (!productResponse.ok) {
//           throw new Error('Failed to fetch product');
//         }
//         const productData = await productResponse.json();
        
//         if (productData.status === 200 && productData.data) {
//           const product = productData.data;
//           setProduct(product);
          
//           // Select the first weight variant by default
//           if (product.weightVsPrice?.length > 0) {
//             setSelectedWeight(0);
//           }
          
//           // Fetch FAQs after product is set
//           fetchFaqs(product);
//         } else {
//           throw new Error('Product not found');
//         }
//       } catch (err) {
//         console.error('Error fetching product:', err);
//         setError('Failed to load product. Please try again later.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProduct();
//   }, [params.id]); // Only run when product ID changes
  
//   // Function to fetch FAQs
//   const fetchFaqs = async (product: Product) => {
//     if (!product) return;
    
//     try {
//       // Use product._id or product.productId based on what's available
//       const productId = product._id || product.productId;
//       if (!productId) {
//         console.error('No product ID available to fetch FAQs');
//         return;
//       }
      
//       console.log('Fetching FAQs for product ID:', productId);
//       const response = await fetch(`/api/product/${productId}/faq`);
      
//       if (response.ok) {
//         const result = await response.json();
//         console.log('FAQ API Response:', result);
        
//         // Handle both array response and object with data property
//         const faqsData = Array.isArray(result) 
//           ? result 
//           : (result.data || []);
          
//         console.log('Processed FAQs:', faqsData);
//         setFaqs(faqsData);
//       } else {
//         console.error('Failed to fetch FAQs:', response.status, await response.text());
//       }
//     } catch (error) {
//       console.error('Error fetching FAQs:', error);
//     }
//   };
  
//   const toggleFaq = (faqId: string) => {
//     setExpandedFaq(expandedFaq === faqId ? null : faqId);
//   };

//   const incrementQuantity = () => setQuantity(prev => prev + 1);
//   const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

//   const handleAddToCart = async () => {
//     if (!product) return;
    
//     const selectedVariant = product.weightVsPrice[selectedWeight];
    
//     // Use _id for consistency with wishlist
//     const productId = product._id;
    
//     const success = await addToCart({
//       productId,
//       quantity,
//       price: selectedVariant?.price || product.actualPrice,
//       weightOption: selectedVariant?.weight || 'N/A',
//       // These will be used if the product is not found in the database
//       productName: product.title,
//       productImage: product.images?.[0] || '/placeholder-product.jpg',
//     });
    
//     if (!success) {
//       const selectedVariant = product.weightVsPrice?.[selectedWeight];
//       const isOutOfStock = !selectedVariant?.quantity || selectedVariant.quantity <= 0;
      
//       if (isOutOfStock) {
//         toast.error('This product is currently out of stock');
//       } else {
//         toast.error('Failed to add product to cart. Please try again.');
//       }
//     } else {
//       toast.success('Product added to cart!');
//     }
//   };

//   const handleWishlistToggle = async () => {
//     if (!product) return;
//     // Use _id for consistency with backend
//     const productId = product._id;
//     await toggleWishlist(productId);
//   };

//   if (loading) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="flex justify-center items-center h-64">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
//         </div>
//       </div>
//     );
//   }

//   if (error || !product) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center py-12">
//           <h2 className="text-2xl font-semibold text-gray-800 mb-4">Product Not Found</h2>
//           <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
//           <Link href="/products" className="inline-flex items-center text-green-600 hover:text-green-800">
//             <ArrowLeft className="w-4 h-4 mr-1" />
//             Back to Shop
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <div className="mb-6">
//         <Link href="/products" className="flex items-center text-gray-600 hover:text-primary">
//           <ArrowLeft className="w-5 h-5 mr-1" />
//           Back to Shop
//         </Link>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
//         {/* Product Images */}
//         <div className="bg-white rounded-lg overflow-hidden">
//           {/* Main Image with Zoom */}
//           <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
//             {product.images?.[selectedImageIndex] ? (
//               <div className="w-full h-full flex items-center justify-center p-4 relative">
//                 {/* Zoom Controls */}
//                 <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg">
//                   <button 
//                     onClick={zoomIn}
//                     className="p-2 rounded-full hover:bg-gray-100 transition-colors"
//                     aria-label="Zoom in"
//                   >
//                     <ZoomIn className="w-4 h-4 text-gray-700" />
//                   </button>
//                   <div className="h-px bg-gray-200 mx-1"></div>
//                   <button 
//                     onClick={zoomOut}
//                     className="p-2 rounded-full hover:bg-gray-100 transition-colors"
//                     aria-label="Zoom out"
//                   >
//                     <ZoomOut className="w-4 h-4 text-gray-700" />
//                   </button>
//                   <div className="h-px bg-gray-200 mx-1"></div>
//                   <button 
//                     onClick={resetZoom}
//                     className="p-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
//                     aria-label="Reset zoom"
//                   >
//                     {Math.round(scale * 100)}%
//                   </button>
//                 </div>
                
//                 {/* Main Image */}
//                 <div 
//                   ref={containerRef}
//                   className="w-full h-full flex items-center justify-center select-none touch-none"
//                   style={{
//                     transform: `scale(${scale})`,
//                     transformOrigin: 'center center',
//                     transition: 'transform 0.2s ease-out',
//                   }}
//                 >
//                   <Image
//                     src={product.images[selectedImageIndex]}
//                     alt={`${product.title} - ${selectedImageIndex + 1}`}
//                     width={600}
//                     height={600}
//                     className="max-w-full max-h-full object-contain"
//                     priority
//                   />
//                 </div>
                
//                 {/* Share Button */}
//                 <div className="absolute bottom-4 right-4 z-10">
//                   <button 
//                     className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
//                     aria-label="Share product"
//                   >
//                     <Share2 className="w-5 h-5 text-gray-700" />
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div className="w-full h-full flex items-center justify-center bg-gray-100">
//                 <span className="text-gray-400">No image available</span>
//               </div>
//             )}
//           </div>
          
//           {/* Thumbnail Gallery */}
//           {product.images && product.images.length > 1 && (
//             <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
//               {product.images.map((img: string, i: number) => (
//                 <button
//                   key={i}
//                   onClick={() => setSelectedImageIndex(i)}
//                   className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
//                     selectedImageIndex === i ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
//                   }`}
//                 >
//                   {img ? (
//                     <Image
//                       src={img}
//                       alt={`${product.title} ${i + 1}`}
//                       width={80}
//                       height={80}
//                       className="w-full h-full object-cover"
//                       sizes="(max-width: 768px) 20vw, 10vw"
//                     />
//                   ) : (
//                     <div className="w-full h-full bg-gray-200 flex items-center justify-center">
//                       <span className="text-gray-400 text-xs">No image</span>
//                     </div>
//                   )}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Product Info */}
//         <div>
//           <div className="mb-4">
//             {product.categoryId && (
//               <span className="text-sm text-gray-500">{product.categoryId}</span>
//             )}
//             <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.title}</h1>
//             <div className="flex items-center mt-2">
//               <div className="flex items-center">
//                 {[...Array(5)].map((_, i) => (
//                   <Star
//                     key={i}
//                     className={`w-5 h-5 ${
//                       i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
//                     }`}
//                     fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
//                   />
//                 ))}
//                 <span className="ml-2 text-sm text-gray-500">
//                   {product.rating > 0 ? `${product.rating.toFixed(1)} (${product.reviewCount} reviews)` : 'No reviews yet'}
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div className="mb-6">
//             <div className="flex items-baseline">
//               <span className="text-3xl font-bold text-gray-900">₹{product.actualPrice.toFixed(2)}</span>
//               {product.mrp > product.actualPrice && (
//                 <span className="ml-2 text-lg text-gray-500 line-through">
//                   ₹{product.mrp.toFixed(2)}
//                 </span>
//               )}
//               {product.mrp > product.actualPrice && (
//                 <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
//                   {Math.round((1 - product.actualPrice / product.mrp) * 100)}% OFF
//                 </span>
//               )}
//             </div>
//             {product.weightVsPrice?.[selectedWeight]?.quantity > 0 ? (
//               <span className="text-green-600 text-sm font-medium">In Stock ({product.weightVsPrice[selectedWeight].quantity} available)</span>
//             ) : (
//               <span className="text-red-600 text-sm font-medium">Out of Stock</span>
//             )}
//           </div>

//           <div className="mb-6">
//             {product.healthBenefits && (
//               <p className="text-gray-700 mb-4">{product.healthBenefits}</p>
//             )}
//             {product.description && (
//               <p className="text-gray-700 mb-4">{product.description}</p>
//             )}
            
//             {product.details && (
//               <div className="mb-6">
//                 <h3 className="font-medium mb-2">Product Details:</h3>
//                 <div className="whitespace-pre-line text-gray-700">
//                   {product.details}
//                 </div>
//               </div>
//             )}

//             <div className="mb-6">
//               <div className="flex items-center mb-4">
//                 <span className="mr-4 text-gray-700">Quantity:</span>
//                 <div className="flex items-center border rounded-md">
//                   <button
//                     onClick={decrementQuantity}
//                     className="px-3 py-1 text-gray-600 hover:bg-gray-100"
//                     disabled={quantity <= 1}
//                     aria-label="Decrease quantity"
//                   >
//                     <Minus className="w-4 h-4" />
//                   </button>
//                   <span className="px-4 py-1 border-x">{quantity}</span>
//                   <button
//                     onClick={incrementQuantity}
//                     className="px-3 py-1 text-gray-600 hover:bg-gray-100"
//                     aria-label="Increase quantity"
//                   >
//                     <Plus className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>

//               <div className="flex flex-wrap gap-3">
//                 {(() => {
//                   const isOutOfStock = !product.weightVsPrice?.[selectedWeight]?.quantity || product.weightVsPrice[selectedWeight].quantity <= 0;
//                   // Use _id for consistency with backend
//                   const productId = product._id;
//                   const inWishlist = isInWishlist(productId);
                  
//                   return (
//                     <>
//                       <Button 
//                         onClick={handleAddToCart}
//                         className="flex-1 bg-green-600 hover:bg-green-700"
//                         disabled={isOutOfStock}
//                       >
//                         {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
//                       </Button>
//                       <Button 
//                         variant="outline" 
//                         className="flex-1"
//                         disabled={isOutOfStock}
//                       >
//                         Buy Now
//                       </Button>
//                       <Button 
//                         variant="outline"
//                         onClick={handleWishlistToggle}
//                         disabled={wishlistLoading}
//                         className={`px-4 ${inWishlist ? 'text-red-500 border-red-500 hover:bg-red-50' : ''}`}
//                         aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
//                       >
//                         <Heart 
//                           className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`}
//                         />
//                       </Button>
//                     </>
//                   );
//                 })()}
//               </div>
//             </div>
//           </div>

//           {product.weightVsPrice?.length > 0 && (
//             <div className="mt-4">
//               <h4 className="text-sm font-medium text-gray-700 mb-2">Select Weight:</h4>
//               <div className="flex flex-wrap gap-2">
//                 {product.weightVsPrice.map((variant, index) => (
//                   <button
//                     key={index}
//                     onClick={() => setSelectedWeight(index)}
//                     className={`px-3 py-1 text-sm rounded-md border ${
//                       selectedWeight === index
//                         ? 'bg-green-100 border-green-500 text-green-800'
//                         : 'border-gray-300 hover:bg-gray-50'
//                     }`}
//                   >
//                     {variant.weight} - ₹{variant.price.toFixed(2)}
//                   </button>
//                 ))} 
//               </div>
//             </div>
//           )}
          
//           <div className="border-t border-gray-200 pt-4 mt-4">
//             <div className="text-sm text-gray-600">
//               <h4 className="font-medium mb-2">Product Details:</h4>
//               <p className="mb-2">{product.description}</p>
              
//               {product.nutrition?.length > 0 && (
//                 <div className="mt-2">
//                   <h5 className="font-medium">Nutritional Information:</h5>
//                   <ul className="list-disc pl-5">
//                     {product.nutrition.map((item, index) => (
//                       <li key={index}>
//                         <span className="font-medium">{item.weight}:</span> {item.info}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
              
//               {product.vitamins?.length > 0 && (
//                 <div className="mt-2">
//                   <h5 className="font-medium">Vitamins:</h5>
//                   <p>{product.vitamins.join(', ')}</p>
//                 </div>
//               )}
              
//               {product.dietary?.length > 0 && (
//                 <div className="mt-2">
//                   <h5 className="font-medium">Dietary Information:</h5>
//                   <p>{product.dietary.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</p>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* FAQ Section */}
//           <div className="mt-12 border-t border-gray-200 pt-8">
//             <h3 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
//             {faqs.length > 0 ? (
//               <div className="space-y-4">
//                 {faqs.map((faq) => (
//                   <div key={faq._id || faq.faqId} className="border-b border-gray-200 pb-4">
//                     <button
//                       className="w-full flex justify-between items-center text-left py-3 focus:outline-none"
//                       onClick={() => toggleFaq(faq.faqId || faq._id)}
//                       aria-expanded={expandedFaq === (faq.faqId || faq._id)}
//                       aria-controls={`faq-${faq.faqId || faq._id}`}
//                     >
//                       <span className="font-medium text-gray-900">{faq.question}</span>
//                       {expandedFaq === (faq.faqId || faq._id) ? (
//                         <ChevronUp className="h-5 w-5 text-gray-500" />
//                       ) : (
//                         <ChevronDown className="h-5 w-5 text-gray-500" />
//                       )}
//                     </button>
//                     {expandedFaq === (faq.faqId || faq._id) && (
//                       <div id={`faq-${faq.faqId || faq._id}`} className="mt-2 text-gray-600">
//                         <p>{faq.answer}</p>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-500">No FAQs available for this product.</p>
//             )}
//           </div>

//           {/* Reviews Section */}
//           <div className="mt-12 border-t border-gray-200 pt-8">
//             <div className="flex items-center justify-between mb-6">
//               <h3 className="text-xl font-semibold text-gray-900">Reviews & Ratings</h3>
//               {user && (
//                 <Button
//                   onClick={() => setShowReviewForm(!showReviewForm)}
//                   className="bg-green-600 hover:bg-green-700"
//                 >
//                   {showReviewForm ? 'Cancel' : 'Write a Review'}
//                 </Button>
//               )}
//               {!user && (
//                 <Link href="/login">
//                   <Button className="bg-green-600 hover:bg-green-700">
//                     Login to Write Review
//                   </Button>
//                 </Link>
//               )}
//             </div>

//             {showReviewForm && user && (
//               <div className="mb-8">
//                 <ReviewForm
//                   productId={product.productId}
//                   userId={user.id || user._id || ''}
//                   onSuccess={() => {
//                     setShowReviewForm(false);
//                     setReviewRefresh(prev => prev + 1);
//                     toast.success('Review submitted successfully!');
//                   }}
//                 />
//               </div>
//             )}

//             <ReviewList 
//               productId={product.productId} 
//               refreshTrigger={reviewRefresh}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
