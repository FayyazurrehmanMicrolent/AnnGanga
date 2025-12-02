'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Image from 'next/image';

interface Banner {
  _id: string;
  bannerId: string;
  title: string;
  textColor?: string;
  textAlignment?: string;
  position?: string;
  bannerType?: string;
  isActive: boolean;
  priority?: number;
  startDate?: string;
  endDate?: string;
  images: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get('/api/banners?active=true');
        if (response.data.status === 200) {
          setBanners(response.data.data);
        } else {
          setError('Failed to load banners');
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
        setError('Error loading banners. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Slider settings with smooth transitions
  const settings = {
    dots: true,
    infinite: true,
    speed: 600, // Slower animation speed for smoother transition
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000, // Change slide every 2 seconds
    pauseOnHover: true,
    fade: true, // Fade effect for smoother transition
    arrows: true, // Show navigation arrows
    cssEase: 'cubic-bezier(0.4, 0, 0.2, 1)', // Smoother easing function
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading banners...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-lg flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (banners.length === 0) {
    // Show promotional banner when no banners are available
    return (
      <div className="w-full rounded-lg overflow-hidden bg-gradient-to-r from-green-600 to-green-700 text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-yellow-400 text-green-800 text-sm font-bold px-3 py-1 rounded-full mb-4">
            LIMITED TIME OFFER
          </div>
          <h2 className="text-2xl md:text-4xl font-bold mb-3">20% OFF on your first purchase</h2>
          <p className="text-lg md:text-xl mb-6">Use code <span className="font-mono bg-black/20 px-2 py-1 rounded">FIRST20</span> at checkout</p>
          <button className="bg-white text-green-700 font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition-colors">
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  // Flatten all banner images into a single array for the slider
  const allBannerImages = banners.flatMap(banner => 
    banner.images?.map((image, index) => ({
      ...banner,
      imageUrl: image,
      uniqueId: `${banner._id}-${index}`
    })) || []
  );

  return (
    <div className="">
      <style jsx global>{`
        /* Custom styles for the slider */
        .slick-slider {
          position: relative;
          z-index: 1;
        }
        .slick-dots {
          bottom: 15px;
        }
        .slick-dots li button:before {
          font-size: 10px;
          color: white;
          opacity: 0.5;
        }
        .slick-dots li.slick-active button:before {
          color: white;
          opacity: 1;
        }
        /* Hide previous and next arrows */
        .slick-prev,
        .slick-next {
          display: none !important;
        }
        .slick-prev {
          left: 15px;
        }
        .slick-next {
          right: 15px;
        }
        .banner-slide {
          position: relative;
          width: 100%;
          height: 64vh;
          min-height: 400px;
          max-height: 700px;
        }
        @media (max-width: 768px) {
          .banner-slide {
            height: 50vh;
            min-height: 300px;
          }
        }
      `}</style>
      
      <Slider {...settings}>
        {allBannerImages.map((banner) => (
          <div key={banner.uniqueId} className="banner-slide">
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div 
                className={`p-4 max-w-4xl w-full ${
                  banner.textAlignment === 'left' ? 'text-left' : 
                  banner.textAlignment === 'right' ? 'text-right' : 'text-center'
                }`}
                style={{ color: banner.textColor || '#ffffff' }}
              >
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
                  {banner.title}
                </h2>
                {banner.startDate && banner.endDate && (
                  <div className="mb-4 text-lg md:text-xl font-medium text-white drop-shadow-md">
                    Offer valid from {new Date(banner.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} to {new Date(banner.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                <button className="mt-4 bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-all transform hover:scale-105">
                  Shop Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
