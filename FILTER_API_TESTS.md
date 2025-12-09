# Product Filter API - Test Cases

## Endpoint
`POST /api/product?action=filter`

**Note:** Filters are sent in the request body as JSON payload, not as query parameters.

---

## Test Case 1: Basic Pagination
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "page": 1,
  "limit": 10
}
```

**Expected Response:**
- Returns first 10 products
- Includes pagination metadata
- All non-deleted products

---

## Test Case 2: Price Range Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "minPrice": 100,
  "maxPrice": 500
}
```

**Expected Response:**
- All products with actualPrice between 100-500
- Sorted by newest (default)

---

## Test Case 3: Star Rating Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "rating": 4
}
```

**Expected Response:**
- Products with average rating >= 4 stars
- Includes averageRating and totalReviews for each product

---

## Test Case 4: Category Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "categoryId": "category-uuid"
}
```

**Expected Response:**
- Only products from specified category
- Includes all product details

---

## Test Case 5: Dietary Tags Filter (Single)
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "dietary": "Vegan"
}
```

**Expected Response:**
- Only products tagged with "Vegan"

---

## Test Case 6: Dietary Tags Filter (Multiple)
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "dietary": ["Vegan", "Gluten Free", "Organic"]
}
```

**Expected Response:**
- Products tagged with any of: Vegan, Gluten Free, or Organic

---

## Test Case 7: Vitamins Filter (Single)
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "vitamins": "C"
}
```

**Expected Response:**
- Only products containing Vitamin C

---

## Test Case 8: Vitamins Filter (Multiple)
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "vitamins": ["A", "C", "D"]
}
```

**Expected Response:**
- Products containing any of: Vitamin A, C, or D

---

## Test Case 9: Discount Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "discount": true
}
```

**Expected Response:**
- Only products where actualPrice < mrp
- Each product includes discountPercentage

---

## Test Case 10: Normal Delivery Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "delivery": "Normal Delivery"
}
```

**Expected Response:**
- Only products with "Normal Delivery" option

---

## Test Case 11: Expedited Delivery Filter
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "delivery": "Expedited Delivery"
}
```

**Expected Response:**
- Only products with "Expedited Delivery" option

---

## Test Case 12: Combined Filters
**Request:**
```
POST /api/product?action=filter
Content-Type: application/json

{
  "page": 1,
  "limit": 20,
  "minPrice": 100,
  "maxPrice": 1000,
  "rating": 4,
  "categoryId": "category-uuid",
  "dietary": ["Vegan"],
  "vitamins": ["C"],
  "discount": true,
  "delivery": "Normal Delivery",
  "sortBy": "price-asc"
}
```

**Expected Response:**
- Products matching ALL specified filters:
  - Price between 100-1000
  - Rating >= 4 stars
  - From specified category
  - Tagged as Vegan
  - Contains Vitamin C
  - Has discount
  - Normal delivery available
- Sorted by price (low to high)
- Page 1, 20 items per page
