# Tags Filter Feature Summary

## ✅ What's New

The Product Filter API now supports filtering by product tags (arrival, featured, hamper) - all three can be filtered together!

---

## 🎯 Feature Overview

### Tags Filter Parameter
- **Parameter:** `tags`
- **Type:** String (comma-separated)
- **Example Values:**
  - Single: `tags=arrival`
  - Multiple: `tags=arrival,featured,hamper`

### How It Works
- **OR Logic:** Products with ANY of the specified tags will be returned
- **Case-Insensitive:** Tags are converted to lowercase for matching
- **Multiple Tags:** Supports filtering arrival, featured, and hamper products together

---

## 📝 API Examples

### Filter Arrival Products Only
```
GET /api/product/filter?tags=arrival
```

### Filter Featured Products Only
```
GET /api/product/filter?tags=featured
```

### Filter All Three Types Together (Arrival + Featured + Hamper)
```
GET /api/product/filter?tags=arrival,featured,hamper
```

### Combined with Other Filters
```
GET /api/product/filter?tags=arrival,featured&minPrice=100&maxPrice=500&rating=4&sortBy=price-asc
```

This will show arrival and featured products that are:
- Priced between ₹100-₹500
- Rated 4+ stars
- Sorted by price (low to high)

---

## 💻 Frontend Usage

### Using TypeScript

```typescript
import { ProductFilterParams } from '@/types/productFilter';

// Filter all three types together
const filters: ProductFilterParams = {
  tags: ['arrival', 'featured', 'hamper'],
  sortBy: 'newest',
  page: 1,
  limit: 20
};
```

### Using React Hook

```typescript
import { useProductFilter } from '@/hooks/useProductFilter';

function ProductListPage() {
  const { products, loading, updateFilters } = useProductFilter();

  // Show all arrival, featured, and hamper products
  const showAllSpecialProducts = () => {
    updateFilters({
      tags: 'arrival,featured,hamper'
    });
  };

  // Show only arrival products
  const showArrivalOnly = () => {
    updateFilters({
      tags: 'arrival'
    });
  };

  return (
    <div>
      <button onClick={showAllSpecialProducts}>
        Show All Special Products
      </button>
      <button onClick={showArrivalOnly}>
        Show Arrivals Only
      </button>
      
      {loading ? <p>Loading...</p> : (
        <div>
          {products.map(product => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Using Fetch API

```typescript
// Filter arrival, featured, and hamper together
const response = await fetch(
  '/api/product/filter?tags=arrival,featured,hamper&page=1&limit=20'
);
const data = await response.json();

console.log('Special Products:', data.data.products);
console.log('Applied Filters:', data.data.appliedFilters.tags);
// Output: ["arrival", "featured", "hamper"]
```

---

## 📊 Response Example

```json
{
  "status": 200,
  "message": "Products filtered successfully",
  "data": {
    "products": [
      {
        "productId": "uuid-1",
        "title": "New Organic Almonds",
        "tags": ["arrival", "featured"],
        "actualPrice": 400,
        "averageRating": 4.5,
        ...
      },
      {
        "productId": "uuid-2",
        "title": "Premium Gift Hamper",
        "tags": ["hamper", "featured"],
        "actualPrice": 1500,
        "averageRating": 4.8,
        ...
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalProducts": 45,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "appliedFilters": {
      "tags": ["arrival", "featured", "hamper"],
      "sortBy": "newest",
      ...
    }
  }
}
```

---

## 🎨 UI Component Example

```tsx
'use client';

import { useState } from 'react';
import { useProductFilter } from '@/hooks/useProductFilter';

export default function ProductTagsFilter() {
  const { products, loading, updateFilters, appliedFilters } = useProductFilter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = [
    { value: 'arrival', label: 'New Arrivals' },
    { value: 'featured', label: 'Featured' },
    { value: 'hamper', label: 'Gift Hampers' }
  ];

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    updateFilters({
      tags: newTags.length > 0 ? newTags.join(',') : undefined
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Product Categories</h2>
      
      {/* Tag Buttons */}
      <div className="flex gap-2 mb-6">
        {availableTags.map(tag => (
          <button
            key={tag.value}
            onClick={() => toggleTag(tag.value)}
            className={`px-4 py-2 rounded-full border ${
              selectedTags.includes(tag.value)
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={product.productId} className="border rounded-lg p-4">
              <img 
                src={product.images[0]} 
                alt={product.title}
                className="w-full h-48 object-cover rounded mb-2"
              />
              <h3 className="font-semibold">{product.title}</h3>
              <p className="text-lg font-bold">₹{product.actualPrice}</p>
              
              {/* Show product tags */}
              <div className="flex gap-1 mt-2">
                {product.tags?.map(tag => (
                  <span 
                    key={tag}
                    className="text-xs bg-gray-100 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🔍 Technical Details

### Database Query
```javascript
// Single tag
filter.tags = 'arrival';

// Multiple tags (OR logic)
filter.tags = { $in: ['arrival', 'featured', 'hamper'] };
```

### Implementation Location
- **API Route:** `/app/api/product/filter/route.ts`
- **Types:** `/types/productFilter.ts`
- **Hook:** `/hooks/useProductFilter.ts`

---

## ✨ Benefits

1. **Unified Display:** Show arrival, featured, and hamper products together
2. **Flexible Filtering:** Select one or multiple tags as needed
3. **Better UX:** Users can see all special products in one view
4. **Easy Integration:** Works seamlessly with other filters
5. **Performance:** Uses MongoDB indexes for fast queries

---

## 📚 Related Documentation

- Full API Documentation: `PRODUCT_FILTER_API_README.md`
- Test Cases: `FILTER_API_TESTS.md`
- API Reference: `API_DOCUMENTATION.md`

---

## 🎉 Usage Tips

1. **Show All Special Products:**
   ```
   GET /api/product/filter?tags=arrival,featured,hamper
   ```

2. **Combine with Price Filter:**
   ```
   GET /api/product/filter?tags=arrival,featured&minPrice=100&maxPrice=500
   ```

3. **Sort by Rating:**
   ```
   GET /api/product/filter?tags=arrival,featured,hamper&sortBy=rating-desc
   ```

4. **Discount Products Only:**
   ```
   GET /api/product/filter?tags=arrival,featured,hamper&discount=true
   ```
