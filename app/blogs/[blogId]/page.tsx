'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, User, Tag, ArrowLeft } from 'lucide-react';

interface Product {
  productId: string;
  title: string;
  actualPrice: number;
  mrp: number;
  images: string[];
  weightVsPrice: Array<{
    weight: string;
    price: number;
    quantity?: number;
  }>;
}

interface Blog {
  _id: string;
  blogId: string;
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  publishedDate: string;
  tags?: string[];
  author?: string;
  productLinks?: string[];
}

export default function BlogPostPage() {
  const params = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${imagePath}`;
  };

  const fetchProductDetails = async (productId: string) => {
    try {
      const response = await fetch(`/api/product?id=${productId}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (data.status === 200 && data.data) {
        const productData = data.data;
        if (!productData.images || !Array.isArray(productData.images)) {
          productData.images = [];
        }
        return productData;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching product ${productId}:`, err);
      return null;
    }
  };

  const fetchAllProducts = async (productIds: string[]) => {
    if (!productIds || productIds.length === 0) {
      setLoadingProducts(false);
      return {};
    }

    const productsMap: Record<string, Product> = {};
    const validProductIds = productIds.filter(id => id && id.trim() !== '');

    try {
      const productPromises = validProductIds.map(id => fetchProductDetails(id));
      const productsData = await Promise.all(productPromises);

      productsData.forEach((product, index) => {
        if (product) {
          productsMap[validProductIds[index]] = product;
        }
      });
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }

    return productsMap;
  };

  useEffect(() => {
    const fetchBlogAndProducts = async () => {
      try {
        const blogId = Array.isArray(params.blogId) ? params.blogId[0] : params.blogId;
        const response = await fetch(`/api/blogs?id=${blogId}`);
        if (!response.ok) throw new Error('Failed to fetch blog post');

        const data = await response.json();
        if (data.status !== 200) throw new Error(data.message || 'Failed to load blog');

        setBlog(data.data);

        if (data.data.productLinks && data.data.productLinks.length > 0) {
          setLoadingProducts(true);
          const productsMap = await fetchAllProducts(data.data.productLinks);
          setProducts(productsMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.blogId) fetchBlogAndProducts();
  }, [params.blogId]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg">Loading article...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-xl p-10">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Oops! Something went wrong</h1>
          <p className="text-gray-600 mb-8">{error || 'This blog post could not be found.'}</p>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section with Featured Image */}
      {blog.images && blog.images.length > 0 && (
        <div className="relative h-96 md:h-[500px] lg:h-[600px] overflow-hidden">
          <Image
            src={getImageUrl(blog.images[0])}
            alt={blog.title}
            fill
            className="object-cover brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white">
            <div className="max-w-5xl mx-auto">
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm font-medium transition"
              >
                <ArrowLeft className="w-5 h-5" />
                All Articles
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl">
                {blog.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 mt-8 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(blog.publishedDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</span>
                </div>
                {blog.author && (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span>{blog.author}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <article className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        {/* Title & Meta (if no featured image) */}
        {!blog.images?.length && (
          <header className="mb-12">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Blogs
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 mt-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {new Date(blog.publishedDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              {blog.author && (
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {blog.author}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Blog Content */}
        <div className="prose prose-lg max-w-none lg:prose-xl">
          <div 
            className="leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ 
              __html: blog.content
                .replace(/\n/g, '<br />')
                .replace(/<p>/g, '<p class="mb-6">')
                .replace(/<h2>/g, '<h2 class="text-3xl font-bold mt-12 mb-6 text-gray-900">')
                .replace(/<h3>/g, '<h3 class="text-2xl font-semibold mt-10 mb-5 text-gray-800">')
            }} 
          />
        </div>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="mt-16 pt-10 border-t-2 border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <Tag className="w-6 h-6 text-indigo-600" />
              Topics
            </h3>
            <div className="flex flex-wrap gap-3">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-5 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-100 transition"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Products Section */}
        {blog.productLinks && blog.productLinks.length > 0 && (
          <section className="mt-20 pt-12 border-t-2 border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
              Featured Products
            </h2>

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                    <div className="h-64 bg-gray-200"></div>
                    <div className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-4/5 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : Object.keys(products).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {blog.productLinks
                  .filter(id => products[id])
                  .map((productId) => {
                    const product = products[productId];
                    const minPrice = product.weightVsPrice?.length > 0
                      ? Math.min(...product.weightVsPrice.map(p => p.price))
                      : product.actualPrice || 0;

                    return (
                      <Link
                        key={productId}
                        href={`/products/${productId}`}
                        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                      >
                        <div className="relative h-64 bg-gray-100 overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <Image
                              src={getImageUrl(product.images[0])}
                              alt={product.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              sizes="(max-width: 768px) 100vw, 33vw"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/placeholder-product.jpg';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-gray-400">
                                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
                        </div>

                        <div className="p-6">
                          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition">
                            {product.title || 'Unnamed Product'}
                          </h3>
                          <div className="mt-4 flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-bold text-gray-900">
                                ₹{minPrice.toFixed(0)}
                              </span>
                              {product.mrp > minPrice && (
                                <span className="ml-3 text-sm text-gray-500 line-through">
                                  ₹{product.mrp.toFixed(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-indigo-600 font-medium group-hover:translate-x-2 transition-transform">
                              View →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products available at the moment.</p>
              </div>
            )}
          </section>
        )}

        {/* Footer CTA */}
        <div className="mt-20 text-center">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-3 text-indigo-600 hover:text-indigo-800 font-semibold text-lg"
          >
            <ArrowLeft className="w-6 h-6" />
            Explore More Articles
          </Link>
        </div>
      </article>
    </>
  );
}

// 'use client';

// import { useEffect, useState } from 'react';
// import Image from 'next/image';
// import Link from 'next/link';
// import { useParams } from 'next/navigation';

// interface Product {
//   productId: string;
//   title: string;
//   actualPrice: number;
//   mrp: number;
//   images: string[];
//   weightVsPrice: Array<{
//     weight: string;
//     price: number;
//     quantity?: number;
//   }>;
// }

// interface Blog {
//   _id: string;
//   blogId: string;
//   title: string;
//   content: string;
//   excerpt: string;
//   images: string[];
//   publishedDate: string;
//   tags?: string[];
//   author?: string;
//   productLinks?: string[];
// }

// export default function BlogPostPage() {
//   const params = useParams();
//   const [blog, setBlog] = useState<Blog | null>(null);
//   const [products, setProducts] = useState<Record<string, Product>>({});
//   const [loading, setLoading] = useState(true);
//   const [loadingProducts, setLoadingProducts] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // Helper function to get full image URL
//   const getImageUrl = (imagePath: string) => {
//     if (!imagePath) return '';
//     // If it's already a full URL, return as is
//     if (imagePath.startsWith('http')) return imagePath;
//     // Otherwise, prepend the base URL
//     return `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${imagePath}`;
//   };

//   // Fetch product details
//   const fetchProductDetails = async (productId: string) => {
//     try {
//       console.log(`Fetching product with ID: ${productId}`);
//       const response = await fetch(`/api/product?id=${productId}`);
//       if (!response.ok) {
//         console.error(`Failed to fetch product ${productId}:`, await response.text());
//         return null;
//       }
//       const data = await response.json();
//       console.log('Product data received:', data);
      
//       if (data.status === 200 && data.data) {
//         // Ensure images array exists and has items
//         const productData = data.data;
//         if (!productData.images || !Array.isArray(productData.images)) {
//           productData.images = [];
//         }
//         return productData;
//       }
//       return null;
//     } catch (err) {
//       console.error(`Error fetching product ${productId}:`, err);
//       return null;
//     }
//   };

//   // Fetch all products for a blog post
//   const fetchAllProducts = async (productIds: string[]) => {
//     if (!productIds || productIds.length === 0) return {};
    
//     const productsMap: Record<string, Product> = {};
    
//     try {
//       // Filter out any null/undefined IDs
//       const validProductIds = productIds.filter(id => id && id.trim() !== '');
//       console.log('Fetching products with IDs:', validProductIds);
      
//       // Fetch products in parallel
//       const productPromises = validProductIds.map(id => fetchProductDetails(id));
//       const productsData = await Promise.all(productPromises);
      
//       // Map the results back to their IDs
//       productsData.forEach((product, index) => {
//         if (product) {
//           console.log(`Product ${validProductIds[index]} loaded:`, product.title);
//           if (product.images && product.images.length > 0) {
//             console.log('Product images:', product.images);
//           }
//           productsMap[validProductIds[index]] = product;
//         }
//       });
      
//       console.log('Products map:', productsMap);
//     } catch (err) {
//       console.error('Error fetching products:', err);
//     } finally {
//       setLoadingProducts(false);
//     }
    
//     return productsMap;
//   };

//   // Fetch blog post and related products
//   useEffect(() => {
//     const fetchBlogAndProducts = async () => {
//       try {
//         const blogId = Array.isArray(params.blogId) ? params.blogId[0] : params.blogId;
//         const response = await fetch(`/api/blogs?id=${blogId}`);
//         if (!response.ok) {
//           throw new Error('Failed to fetch blog post');
//         }
//         const data = await response.json();
        
//         if (data.status === 200) {
//           setBlog(data.data);
          
//           // If there are product links, fetch their details
//           if (data.data.productLinks && data.data.productLinks.length > 0) {
//             setLoadingProducts(true);
//             const productsMap = await fetchAllProducts(data.data.productLinks);
//             setProducts(productsMap);
//           }
//         } else {
//           throw new Error(data.message || 'Failed to load blog post');
//         }
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'An error occurred');
//         console.error('Error:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (params.blogId) {
//       fetchBlogAndProducts();
//     }
//   }, [params.blogId]);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
//       </div>
//     );
//   }

//   if (error || !blog) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center p-4">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Blog Post</h1>
//           <p className="text-gray-600 mb-6">
//             {error || 'The blog post could not be found.'}
//           </p>
//           <Link 
//             href="/blogs" 
//             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//           >
//             ← Back to all posts
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-white">
//       <article className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
//         <div className="mb-8">
//           <Link 
//             href="/blogs" 
//             className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
//           >
//             ← Back to all posts
//           </Link>
          
//           <div className="flex justify-between items-center mb-4">
//             <span className="text-sm text-gray-500">
//               {new Date(blog.publishedDate).toLocaleDateString('en-US', {
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric',
//               })}
//             </span>
//             {blog.author && (
//               <span className="text-sm font-medium text-indigo-600">
//                 By {blog.author}
//               </span>
//             )}
//           </div>
          
//           <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-6">
//             {blog.title}
//           </h1>
          
//           {blog.images && blog.images.length > 0 && (
//             <div className="relative h-96 w-full rounded-lg overflow-hidden mb-8">
//               <Image
//                 src={blog.images[0]}
//                 alt={blog.title}
//                 fill
//                 className="object-cover"
//                 priority
//               />
//             </div>
//           )}
//         </div>

//         <div className="prose prose-indigo prose-lg max-w-none">
//           <div dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br />') }} />
//         </div>

//         {blog.tags && blog.tags.length > 0 && (
//           <div className="mt-12 pt-8 border-t border-gray-200">
//             <h3 className="text-sm font-medium text-gray-900 mb-4">Tags</h3>
//             <div className="flex flex-wrap gap-2">
//               {blog.tags.map((tag) => (
//                 <span
//                   key={tag}
//                   className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
//                 >
//                   {tag}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}

//         {blog.productLinks && blog.productLinks.length > 0 && (
//           <div className="mt-12 pt-8 border-t border-gray-200">
//             <h3 className="text-lg font-medium text-gray-900 mb-6">Related Products</h3>
//             {loadingProducts ? (
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
//                 {[1, 2, 3].map((i) => (
//                   <div key={i} className="animate-pulse">
//                     <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
//                     <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
//                     <div className="h-4 bg-gray-200 rounded w-1/2"></div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
//                 {blog.productLinks
//                   .filter(productId => products[productId]) // Only show products that were successfully loaded
//                   .map((productId) => {
//                     const product = products[productId];
//                     const hasImages = product?.images?.length > 0;
//                     const minPrice = product?.weightVsPrice?.length > 0 
//                       ? Math.min(...product.weightVsPrice.map(p => p.price))
//                       : product?.actualPrice || 0;
                    
//                     return (
//                       <div key={productId} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
//                         <Link href={`/products/${productId}`} className="block">
//                           <div className="relative h-48 w-full bg-gray-100">
//                             {hasImages ? (
//                               <div className="relative w-full h-full">
//                                 <Image
//                                   src={getImageUrl(product.images[0])}
//                                   alt={product.title || 'Product image'}
//                                   fill
//                                   className="object-cover"
//                                   sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//                                   priority
//                                   onError={(e) => {
//                                     // Fallback to placeholder if image fails to load
//                                     const target = e.target as HTMLImageElement;
//                                     target.onerror = null;
//                                     target.src = '/images/placeholder-product.jpg';
//                                   }}
//                                 />
//                               </div>
//                             ) : (
//                               <div className="w-full h-full flex items-center justify-center bg-gray-200">
//                                 <svg
//                                   className="w-16 h-16 text-gray-400"
//                                   fill="none"
//                                   stroke="currentColor"
//                                   viewBox="0 0 24 24"
//                                   xmlns="http://www.w3.org/2000/svg"
//                                 >
//                                   <path
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     strokeWidth={1}
//                                     d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
//                                   />
//                                 </svg>
//                               </div>
//                             )}
//                           </div>
//                           <div className="p-4">
//                             <h4 className="font-medium text-gray-900 mb-1 line-clamp-2 h-12">
//                               {product?.title || `Product ${productId.substring(0, 8)}`}
//                             </h4>
//                             <div className="flex items-center justify-between mt-2">
//                               <span className="text-lg font-semibold text-gray-900">
//                                 ₹{minPrice.toFixed(2)}
//                               </span>
//                               {product?.mrp && product.mrp > minPrice && (
//                                 <span className="text-sm text-gray-500 line-through">
//                                   ₹{product.mrp.toFixed(2)}
//                                 </span>
//                               )}
//                             </div>
//                           </div>
//                         </Link>
//                       </div>
//                     );
//                   })}
//                 {Object.keys(products).length === 0 && !loadingProducts && (
//                   <div className="col-span-full text-center py-6">
//                     <p className="text-gray-500">No product details available</p>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         )}
//       </article>
//     </div>
//   );
// }
