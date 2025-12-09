# Product Filter API Documentation

A comprehensive filtering API for products with pagination, multiple filter options, and sorting capabilities.

## 📋 Table of Contents
- [Endpoint](#endpoint)
- [Features](#features)
- [Query Parameters](#query-parameters)
- [Response Structure](#response-structure)
- [Usage Examples](#usage-examples)
- [Frontend Integration](#frontend-integration)
- [Performance Considerations](#performance-considerations)

---

## 🔗 Endpoint

```
GET /api/product/filter
```

---

## ✨ Features

### 1. **Price Range Filter**
- Filter by minimum price
- Filter by maximum price
- Filter by price range (both min and max)

### 2. **Star Rating Filter**
- Filter products by minimum average rating (1-5 stars)
- Based on approved customer reviews
- Products with no reviews show 0 rating

### 3. **Category Filter**
- Filter products by category ID
- Single category selection

### 4. **Dietary Tags Filter**
- Support for multiple dietary preferences
- Examples: Vegan, Gluten Free, Organic, Keto, Halal
- Multiple tags work with OR logic

### 5. **Vitamins Filter**
- Filter by vitamin content
- Support for multiple vitamins
- Examples: A, B, C, D, E, K

### 6. **Discount Filter**
- Show only discounted products
- Automatically calculates discount percentage

### 7. **Delivery Options Filter**
- Normal Delivery
- Expedited Delivery

### 8. **Product Tags Filter**
- Filter by product tags: arrival, featured, hamper
- Support for multiple tags (OR logic)
- Case-insensitive matching

### 9. **Sorting Options**
- `newest`: Most recently added (default)
- `price-asc`: Price low to high
- `price-desc`: Price high to low
- `rating-desc`: Highest rated first

### 10. **Pagination***
- Configurable page size (max 100)
- Page-based navigation
- Complete pagination metadata

---

## 📝 Query Parameters

| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `page` | number | 1 | Page number | `?page=2` |
| `limit` | number | 20 | Items per page (max 100) | `?limit=50` |
| `minPrice` | number | - | Minimum price | `?minPrice=100` |
| `maxPrice` | number | - | Maximum price | `?maxPrice=500` |
| `rating` | number | - | Minimum star rating (1-5) | `?rating=4` |
| `categoryId` | string | - | Category UUID | `?categoryId=abc-123` |
| `dietary` | string | - | Comma-separated dietary tags | `?dietary=Vegan,Gluten Free` |
| `vitamins` | string | - | Comma-separated vitamins | `?vitamins=A,C,D` |
| `discount` | boolean | false | Show only discounted products | `?discount=true` |
| `delivery` | string | - | Delivery type | `?delivery=Normal Delivery` |
| `tags` | string | - | Comma-separated tags | `?tags=arrival,featured,hamper` |
| `sortBy` | string | newest | Sort option | `?sortBy=price-asc` |

---

## 📤 Response Structure

```json
{
  "status": 200,
  "message": "Products filtered successfully",
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "productId": "uuid-here",
        "title": "Organic Almonds",
        "mrp": 500,
        "actualPrice": 400,
        "weightVsPrice": [
          {
            "weight": "250g",
            "price": 400,
            "quantity": 1
          }
        ],
        "nutrition": [],
        "vitamins": ["E", "B2"],
        "delivery": ["Normal Delivery", "Expedited Delivery"],
        "tags": ["featured", "arrival"],
        "dietary": ["Vegan", "Gluten Free"],
        "healthBenefits": "Good for heart health",
        "description": "Premium quality almonds",
        "images": ["/uploads/products/almonds.jpg"],
        "categoryId": "category-uuid",
        "frequentlyBoughtTogether": [],
        "isDeleted": false,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z",
        "averageRating": 4.5,
        "totalReviews": 10,
        "discountPercentage": 20
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProducts": 95,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "appliedFilters": {
      "minPrice": 100,
      "maxPrice": 500,
      "rating": 4,
      "categoryId": null,
      "dietary": ["Vegan"],
      "vitamins": ["C"],
      "discount": true,
      "delivery": "Normal Delivery",
      "sortBy": "price-asc"
    }
  }
}
```

---

## 💡 Usage Examples

### Example 1: Basic Pagination
```
GET /api/product/filter?page=1&limit=20
```

### Example 2: Price Range
```
GET /api/product/filter?minPrice=100&maxPrice=500
```

### Example 3: High-Rated Products
```
GET /api/product/filter?rating=4&sortBy=rating-desc
```

### Example 4: Vegan Products with Vitamin C
```
GET /api/product/filter?dietary=Vegan&vitamins=C
```

### Example 5: Discounted Products
```
GET /api/product/filter?discount=true&sortBy=price-asc
```

### Example 6: Arrival and Featured Products
```
GET /api/product/filter?tags=arrival,featured&sortBy=newest
```

### Example 7: Complex Filter
```
GET /api/product/filter?minPrice=100&maxPrice=1000&rating=4&dietary=Vegan,Organic&vitamins=C,D&discount=true&delivery=Normal Delivery&tags=arrival,featured&sortBy=rating-desc&page=1&limit=20
```

### Example 8: Category with Fast Delivery
```
GET /api/product/filter?categoryId=abc-123&delivery=Expedited Delivery
```

---

## 🎨 Frontend Integration

### Using TypeScript Types

```typescript
import { ProductFilterParams } from '@/types/productFilter';

const filters: ProductFilterParams = {
  page: 1,
  limit: 20,
  minPrice: 100,
  maxPrice: 500,
  rating: 4,
  dietary: ['Vegan', 'Gluten Free'],
  vitamins: ['C', 'D'],
  discount: true,
  sortBy: 'price-asc'
};
```

### Using the React Hook

```typescript
import { useProductFilter } from '@/hooks/useProductFilter';

function ProductList() {
  const { 
    products, 
    pagination, 
    loading, 
    error,
    updateFilters,
    nextPage,
    prevPage
  } = useProductFilter();

  // Apply filters
  const handleFilter = () => {
    updateFilters({
      minPrice: 100,
      maxPrice: 500,
      rating: 4,
      dietary: 'Vegan',
      sortBy: 'price-asc'
    });
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {products.map(product => (
        <ProductCard key={product.productId} product={product} />
      ))}
      <button onClick={prevPage}>Previous</button>
      <button onClick={nextPage}>Next</button>
    </div>
  );
}
```

### Using Fetch API

```typescript
async function fetchFilteredProducts() {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
    minPrice: '100',
    maxPrice: '500',
    rating: '4',
    dietary: 'Vegan,Gluten Free',
    sortBy: 'price-asc'
  });

  const response = await fetch(`/api/product/filter?${params}`);
  const data = await response.json();
  
  if (data.status === 200) {
    console.log('Products:', data.data.products);
    console.log('Pagination:', data.data.pagination);
  }
}
```

---

## ⚡ Performance Considerations

### Database Indexes
Ensure the following indexes exist for optimal performance:

```javascript
// Product model indexes
productSchema.index({ actualPrice: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ dietary: 1 });
productSchema.index({ vitamins: 1 });
productSchema.index({ delivery: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isDeleted: 1 });
```

### Optimization Tips

1. **Use Pagination**: Always use reasonable `limit` values (20-50)
2. **Specific Filters**: More specific filters = faster queries
3. **Rating Cache**: Consider caching average ratings for popular products
4. **CDN for Images**: Use CDN for product images
5. **Database Connection Pooling**: Ensure proper connection pooling

### Rate Limiting
Consider implementing rate limiting:
- Max 100 requests per minute per IP
- Max 1000 requests per hour per user

---

## 🔍 Filter Logic Details

### Price Filter
- Filters based on `actualPrice` field
- Both `minPrice` and `maxPrice` are inclusive
- Can use either or both

### Rating Filter
- Based on average of all **approved** reviews
- Only includes non-deleted reviews
- Products without reviews have rating = 0
- Filter is applied after initial query (post-processing)

### Multiple Value Filters (Dietary & Vitamins)
- Comma-separated values work as **OR** logic
- Example: `dietary=Vegan,Organic` means products with Vegan OR Organic
- Case-sensitive matching

### Discount Filter
- When `discount=true`: shows only products where `actualPrice < mrp`
- Discount percentage calculated as: `((mrp - actualPrice) / mrp) * 100`
- Rounded to nearest integer

### Delivery Filter
- Exact string match required
- Valid values: "Normal Delivery" or "Expedited Delivery"
- Case-sensitive

### Tags Filter
- Comma-separated values work as **OR** logic
- Example: `tags=arrival,featured,hamper` means products with arrival OR featured OR hamper
- Case-insensitive matching (converted to lowercase)
- Common tags: arrival, featured, hamper

---

## 🐛 Error Handling

### Common Errors

**Database Connection Failed**
```json
{
  "status": 500,
  "message": "Database connection failed",
  "data": {}
}
```

**Invalid Parameters**
```json
{
  "status": 500,
  "message": "Failed to filter products",
  "data": {}
}
```

### Error Handling in Frontend

```typescript
try {
  const response = await fetch('/api/product/filter?page=1');
  const data = await response.json();
  
  if (data.status !== 200) {
    throw new Error(data.message);
  }
  
  // Use data.data.products
} catch (error) {
  console.error('Filter error:', error);
  // Show error to user
}
```

---

## 📊 Response Field Descriptions

### Product Fields

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | Unique product identifier (UUID) |
| `title` | string | Product name |
| `mrp` | number | Maximum Retail Price |
| `actualPrice` | number | Current selling price |
| `averageRating` | number | Average rating (0-5) |
| `totalReviews` | number | Count of approved reviews |
| `discountPercentage` | number | Discount % (0-100) |
| `vitamins` | string[] | List of vitamins |
| `dietary` | string[] | Dietary tags |
| `delivery` | string[] | Delivery options |
| `images` | string[] | Product image URLs |

### Pagination Fields

| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | number | Current page number |
| `totalPages` | number | Total number of pages |
| `totalProducts` | number | Total matching products |
| `limit` | number | Items per page |
| `hasNextPage` | boolean | Has next page? |
| `hasPrevPage` | boolean | Has previous page? |

---

## 🧪 Testing

See [FILTER_API_TESTS.md](./FILTER_API_TESTS.md) for comprehensive test cases.

---

## 📌 Notes

1. All prices are in the system's base currency
2. Star ratings are decimal values (e.g., 4.5)
3. Deleted products (`isDeleted: true`) are automatically excluded
4. Images are relative URLs (prepend base URL)
5. Pagination starts from page 1 (not 0)
6. Maximum limit is capped at 100 items per page

---

## 🔐 Future Enhancements

- [ ] Add authentication/authorization
- [ ] Implement result caching
- [ ] Add search by product name
- [ ] Support for multiple categories
- [ ] Add stock availability filter
- [ ] Implement saved filter presets
- [ ] Add export functionality (CSV/PDF)
- [ ] Implement analytics tracking

---

## 📞 Support

For issues or questions about the Filter API:
- Create an issue in the repository
- Contact the development team
- Check the API_DOCUMENTATION.md for general API info
