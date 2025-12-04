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
  activeCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const CategorySlider: React.FC<CategorySliderProps> = ({ 
  categories, 
  theme, 
  activeCategory, 
  onCategorySelect 
}) => {
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
    <div className="w-[90%] mx-auto py-4 relative group overflow-hidden">
      <div className="flex justify-center mb-4">
        <button
          onClick={() => onCategorySelect(null)}
          className={`px-4 py-2 mx-1 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Categories
        </button>
      </div>
      <div
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
            <div key={category._id} className="px-2">
              <div 
                className="flex flex-col items-center cursor-pointer"
                onClick={() => onCategorySelect(category._id)}
              >
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 overflow-hidden transition-all ${
                    (activeCategory === category._id || activeCategory === category.categoryId) 
                      ? 'ring-2 ring-green-500 ring-offset-2' 
                      : 'bg-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {category.image ? (
                    <img 
                      src={category.image} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <span 
                  className={`text-sm text-center ${
                    (activeCategory === category._id || activeCategory === category.categoryId) 
                      ? 'font-semibold text-green-700' 
                      : 'text-gray-700'
                  }`}
                >
                  {category.name}
                </span>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default CategorySlider;
