import { toast } from 'react-hot-toast';

export async function addToCart(product: {
  productId: string;
  price: number;
  weightOption?: string;
  productName?: string;
  productImage?: string;
}) {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add',
        data: {
          productId: product.productId,
          quantity: 1,
          weightOption: product.weightOption,
          price: product.price,
          productName: product.productName,
          productImage: product.productImage,
        },
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      // Redirect to login page if not authenticated
      window.location.href = '/login';
      return false;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add to cart');
    }

    toast.success('Added to cart!');
    return true;
  } catch (error) {
    console.error('Error adding to cart:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to add to cart');
    return false;
  }
}
