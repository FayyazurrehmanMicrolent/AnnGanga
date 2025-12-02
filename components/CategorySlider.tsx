"use client";

import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Package } from 'lucide-react';

interface Category {
  _id: string;
  categoryId: string;
  name: string;
  image: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategorySliderProps {
  categories: Category[];
  theme: {
    primary: any;
    text: string;
  };
}

const CategorySlider: React.FC<CategorySliderProps> = ({ categories, theme }) => {
  const settings = {
    dots: false,
    infinite: true,
    speed: 8000,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: 'linear',
    slidesToShow: 6,
    slidesToScroll: 1,
    initialSlide: 0,
    pauseOnHover: true,
    arrows: false,
    variableWidth: true,
    centerMode: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 4,
          infinite: true,
          dots: true
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          initialSlide: 3
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2
        }
      }
    ]
  };

  return (
    <div 
      className="w-full py-8 relative group overflow-hidden"
      onMouseEnter={() => {
        const slider = document.querySelector('.slick-slider');
        if (slider) {
          slider.dispatchEvent(new Event('mouseenter'));
        }
      }}
      onMouseLeave={() => {
        const slider = document.querySelector('.slick-slider');
        if (slider) {
          slider.dispatchEvent(new Event('mouseleave'));
        }
      }}
    >
      <style jsx global>{`
        .slick-slide > div {
          padding: 0 12px;
        }
        .slick-track {
          display: flex !important;
          align-items: center;
        }
        .slick-dots {
          bottom: -30px !important;
        }
        .slick-dots li button:before {
          font-size: 10px;
          color: ${theme.text}80 !important;
          opacity: 1 !important;
        }
        .slick-dots li.slick-active button:before {
          color: ${theme.primary} !important;
        }
        .slick-slide {
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0.8;
        }
        .slick-slide:hover {
          opacity: 1;
        }
        .slick-active {
          opacity: 1;
          transform: scale(1.02);
        }
        .slick-center {
          transform: scale(1.05);
          opacity: 1;
        }
      `}</style>
      <Slider {...settings}>
        {categories.map((category) => (
          <div key={category.categoryId} className="px-2">
            <div 
              className="flex flex-col items-center justify-center cursor-pointer p-4 transition-all duration-300 ease-out transform hover:scale-110"
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                transition: 'all 0.3s ease-out',
              }}
            >
              <div className="w-16 h-16 mb-2 rounded-full overflow-hidden flex items-center justify-center">
                {category.image ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-12 h-12 object-cover rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/placeholder/category-placeholder.svg';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <p 
                className="text-sm font-medium text-center transition-colors duration-300 hover:text-primary"
                style={{ color: theme.text }}
              >
                {category.name}
              </p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default CategorySlider;
