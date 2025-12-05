'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Star, Heart, Share2, ArrowLeft, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'react-hot-toast';

type Product = {
  _id: string;
  productId: string; // Add productId field
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
  rating?: number; // Make optional since it might not always be present
  reviewCount?: number; // Make optional
  details?: string; // Make optional
};

export default function ProductDetails() {
  // All hooks must be called unconditionally at the top level
  const params = useParams();
  const router = useRouter();
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
  const [activeTab, setActiveCard] = useState('description');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [scale, setScale] = useState(1);
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
        // Fetch the specific product
        const productResponse = await fetch(`/api/product/${params.id}`);
        if (!productResponse.ok) {
          throw new Error('Failed to fetch product');
        }
        const productData = await productResponse.json();
        
        if (productData.status === 200 && productData.data) {
          const product = productData.data;
          setProduct(product);
          
          // Select the first weight variant by default
          if (product.weightVsPrice?.length > 0) {
            setSelectedWeight(0);
          }
          
          // Fetch FAQs after product is set
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
  }, [params.id]); // Only run when product ID changes
  
  // Function to fetch FAQs
  const fetchFaqs = async (product: Product) => {
    if (!product) return;
    
    try {
      // Use product._id or product.productId based on what's available
      const productId = product._id || product.productId;
      if (!productId) {
        console.error('No product ID available to fetch FAQs');
        return;
      }
      
      console.log('Fetching FAQs for product ID:', productId);
      const response = await fetch(`/api/product/${productId}/faq`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('FAQ API Response:', result);
        
        // Handle both array response and object with data property
        const faqsData = Array.isArray(result) 
          ? result 
          : (result.data || []);
          
        console.log('Processed FAQs:', faqsData);
        setFaqs(faqsData);
      } else {
        console.error('Failed to fetch FAQs:', response.status, await response.text());
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
    
    // Use _id for consistency with wishlist
    const productId = product._id;
    
    const success = await addToCart({
      productId,
      quantity,
      price: selectedVariant?.price || product.actualPrice,
      weightOption: selectedVariant?.weight || 'N/A',
      // These will be used if the product is not found in the database
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
    // Use _id for consistency with backend
    const productId = product._id;
    await toggleWishlist(productId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/products" className="inline-flex items-center text-green-600 hover:text-green-800">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/products" className="flex items-center text-gray-600 hover:text-primary">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Shop
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Main Image with Zoom */}
          <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
            {product.images?.[selectedImageIndex] ? (
              <div className="w-full h-full flex items-center justify-center p-4 relative">
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg">
                  <button 
                    onClick={zoomIn}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="h-px bg-gray-200 mx-1"></div>
                  <button 
                    onClick={zoomOut}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="h-px bg-gray-200 mx-1"></div>
                  <button 
                    onClick={resetZoom}
                    className="p-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Reset zoom"
                  >
                    {Math.round(scale * 100)}%
                  </button>
                </div>
                
                {/* Main Image */}
                <div 
                  ref={containerRef}
                  className="w-full h-full flex items-center justify-center select-none touch-none"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out',
                  }}
                >
                  <Image
                    src={product.images[selectedImageIndex]}
                    alt={`${product.title} - ${selectedImageIndex + 1}`}
                    width={600}
                    height={600}
                    className="max-w-full max-h-full object-contain"
                    priority
                  />
                </div>
                
                {/* Share Button */}
                <div className="absolute bottom-4 right-4 z-10">
                  <button 
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors"
                    aria-label="Share product"
                  >
                    <Share2 className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
          
          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                    selectedImageIndex === i ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {img ? (
                    <Image
                      src={img}
                      alt={`${product.title} ${i + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      sizes="(max-width: 768px) 20vw, 10vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-4">
            {product.categoryId && (
              <span className="text-sm text-gray-500">{product.categoryId}</span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.title}</h1>
            <div className="flex items-center mt-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill={i < Math.floor(product.rating || 0) ? 'currentColor' : 'none'}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-500">
                  {(product.rating || 0) > 0 ? `${product.rating?.toFixed(1)} (${product.reviewCount} reviews)` : 'No reviews yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">₹{product.actualPrice.toFixed(2)}</span>
              {product.mrp > product.actualPrice && (
                <span className="ml-2 text-lg text-gray-500 line-through">
                  ₹{product.mrp.toFixed(2)}
                </span>
              )}
              {product.mrp > product.actualPrice && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                  {Math.round((1 - product.actualPrice / product.mrp) * 100)}% OFF
                </span>
              )}
            </div>
            {product.weightVsPrice?.[selectedWeight]?.quantity > 0 ? (
              <span className="text-green-600 text-sm font-medium">In Stock ({product.weightVsPrice[selectedWeight].quantity} available)</span>
            ) : (
              <span className="text-red-600 text-sm font-medium">Out of Stock</span>
            )}
          </div>

          <div className="mb-6">
            {product.healthBenefits && (
              <p className="text-gray-700 mb-4">{product.healthBenefits}</p>
            )}
            {product.description && (
              <p className="text-gray-700 mb-4">{product.description}</p>
            )}
            
            {product.details && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Product Details:</h3>
                <div className="whitespace-pre-line text-gray-700">
                  {product.details}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <span className="mr-4 text-gray-700">Quantity:</span>
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={decrementQuantity}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-1 border-x">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(() => {
                  const isOutOfStock = !product.weightVsPrice?.[selectedWeight]?.quantity || product.weightVsPrice[selectedWeight].quantity <= 0;
                  // Use _id for consistency with backend
                  const productId = product._id;
                  const inWishlist = isInWishlist(productId);
                  
                  return (
                    <>
                      <Button 
                        onClick={handleAddToCart}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        disabled={isOutOfStock}
                      >
                        Buy Now
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleWishlistToggle}
                        disabled={wishlistLoading}
                        className={`px-4 ${inWishlist ? 'text-red-500 border-red-500 hover:bg-red-50' : ''}`}
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart 
                          className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`}
                        />
                      </Button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {product.weightVsPrice?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Select Weight:</h4>
              <div className="flex flex-wrap gap-2">
                {product.weightVsPrice.map((variant, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedWeight(index)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      selectedWeight === index
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {variant.weight} - ₹{variant.price.toFixed(2)}
                  </button>
                ))} 
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="text-sm text-gray-600">
              <h4 className="font-medium mb-2">Product Details:</h4>
              <p className="mb-2">{product.description}</p>
              
              {product.nutrition?.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-medium">Nutritional Information:</h5>
                  <ul className="list-disc pl-5">
                    {product.nutrition.map((item, index) => (
                      <li key={index}>
                        <span className="font-medium">{item.weight}:</span> {item.info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {product.vitamins?.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-medium">Vitamins:</h5>
                  <p>{product.vitamins.join(', ')}</p>
                </div>
              )}
              
              {product.dietary?.length > 0 && (
                <div className="mt-2">
                  <h5 className="font-medium">Dietary Information:</h5>
                  <p>{product.dietary.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* FAQ Section */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h3>
            {faqs.length > 0 ? (
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq._id || faq.faqId} className="border-b border-gray-200 pb-4">
                    <button
                      className="w-full flex justify-between items-center text-left py-3 focus:outline-none"
                      onClick={() => toggleFaq(faq.faqId || faq._id)}
                      aria-expanded={expandedFaq === (faq.faqId || faq._id)}
                      aria-controls={`faq-${faq.faqId || faq._id}`}
                    >
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      {expandedFaq === (faq.faqId || faq._id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    {expandedFaq === (faq.faqId || faq._id) && (
                      <div id={`faq-${faq.faqId || faq._id}`} className="mt-2 text-gray-600">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No FAQs available for this product.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// This would be used for server-side props in a real app
//   const product = await getProductById(params.id);
//   return { props: { product } };
// }
