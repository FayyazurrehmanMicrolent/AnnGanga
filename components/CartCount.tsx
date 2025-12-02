'use client';

import { useCart } from '@/context/CartContext';

export default function CartCount() {
  const { itemCount } = useCart();

  if (itemCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-2 -right-2 bg-green-600 text-[10px] font-bold text-white rounded-full h-5 w-5 grid place-items-center">
      {itemCount}
    </span>
  );
}
