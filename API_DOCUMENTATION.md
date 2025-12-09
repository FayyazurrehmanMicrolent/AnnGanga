# Ann Ganga Backend API Documentation

**Base URL:** `/api`
**Format:** JSON
**Authentication:** Currently open (Auth headers to be implemented)

---

## 📚 Table of Contents
1. [Authentication](#1-authentication)
2. [Product Catalog](#2-product-catalog)
3. [Cart & Checkout](#3-cart--checkout)
4. [Orders](#4-orders)
5. [User Management](#5-user-management)
6. [Coupons & Rewards](#6-coupons--rewards)
7. [Reviews](#7-reviews)
8. [Subscriptions](#8-subscriptions)
9. [Notifications](#9-notifications)
10. [Admin Reports](#10-admin-reports)

---

## 1. Authentication

### Register User
- **Endpoint:** `POST /auth/register`
- **Body:** `{ "phone": "9876543210", "name": "John", "email": "john@example.com" }`
- **Response:** `{ "status": 201, "data": { "id": "uuid", ... } }`

### Login User
- **Endpoint:** `POST /auth/login`
- **Body:** `{ "phone": "9876543210" }`
- **Response:** `{ "status": 200, "message": "OTP sent" }`

---

## 2. Product Catalog

### List Products with Filters (POST)
- **Endpoint:** `POST /product?action=filter`
- **Body:**
  ```json
  {
    "page": 1,
    "limit": 20,
    "minPrice": 100,
    "maxPrice": 500,
    "rating": 4,
    "categoryId": "category-uuid",
    "dietary": ["Vegan", "Gluten Free"],
    "vitamins": ["C", "D"],
    "discount": true,
    "delivery": "Normal Delivery",
    "sortBy": "price-asc"
  }
  ```
- **Response:**
  ```json
  {
    "status": 200,
    "message": "Products filtered successfully",
    "data": {
      "products": [...],
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
        "categoryId": "category-uuid",
        "dietary": ["Vegan", "Gluten Free"],
        "vitamins": ["C", "D"],
        "discount": true,
        "delivery": "Normal Delivery",
        "sortBy": "price-asc"
      }
    }
  }
  ```

### List Products (GET - with filters)
- **Endpoint:** `GET /product`
- **Query Parameters:**
  - `page` (number, default: 1) - Page number
  - `limit` (number, default: 20, max: 100) - Items per page
  - `categoryId` (string) - Filter by category ID
  - `dietary` (string) - Comma-separated dietary tags (e.g., "Vegan,Gluten Free")
  - `tag` (string) - Filter by single tag
  - `minPrice` (number) - Minimum price filter
  - `maxPrice` (number) - Maximum price filter
  - `rating` (number, 1-5) - Minimum star rating
  - `vitamins` (string) - Comma-separated vitamins (e.g., "A,C,D")
  - `discount` (boolean) - Set to `true` for discounted products only
  - `delivery` (string) - "Normal Delivery" or "Expedited Delivery"
  - `sortBy` (string) - Sort option: `price-asc`, `price-desc`, `rating-desc`, `newest` (default)
- **Example:** `GET /product?minPrice=100&maxPrice=500&rating=4&dietary=Vegan&sortBy=price-asc&page=1&limit=20`

### Get Product Details
- **Endpoint:** `GET /product?id={id}`

### Categories
- **Endpoint:** `GET /category`
- **Response:** List of all categories

### Banners
- **Endpoint:** `GET /banners`
- **Query:** `?active=true`

---

## 3. Cart & Checkout

### Get Cart
- **Endpoint:** `GET /cart`
- **Query:** `?userId={uuid}`
- **Response:** Cart items with product details and subtotal

### Add/Update Cart
- **Endpoint:** `POST /cart`
- **Action:** `add` | `update` | `remove` | `clear`
- **Body (Add):**
  ```json
  {
    "action": "add",
    "userId": "uuid",
    "productId": "uuid",
    "quantity": 1,
    "price": 100,
    "weightOption": "1kg"
  }
  ```

### Checkout
- **Endpoint:** `POST /checkout`
- **Body:**
  ```json
  {
    "userId": "uuid",
    "addressId": "uuid",
    "paymentMethod": "cod",
    "deliveryType": "normal",
    "couponCode": "WELCOME20",
    "rewardPoints": 100
  }
  ```
- **Response:** `{ "status": 201, "data": { "orderId": "uuid", "total": 500 } }`

---

## 4. Orders

### List User Orders
- **Endpoint:** `GET /orders`
- **Query:** `?userId={uuid}&status={pending|delivered}&page=1`

### Get Order Details
- **Endpoint:** `GET /orders`
- **Query:** `?orderId={uuid}`

### Cancel Order
- **Endpoint:** `POST /orders`
- **Body:** `{ "action": "cancel", "orderId": "uuid", "reason": "Changed mind" }`

### Admin: List Orders
- **Endpoint:** `GET /admin/orders`
- **Query:** `?status={status}&fromDate={date}&toDate={date}`

### Admin: Update Status
- **Endpoint:** `POST /orders`
- **Body:**
  ```json
  {
    "action": "updatestatus",
    "orderId": "uuid",
    "status": "dispatched",
    "trackingId": "AWB123456",
    "trackingUrl": "https://courier.com/track/123"
  }
  ```

---

## 5. User Management

### Manage Addresses
- **Endpoint:** `GET /address` (List)
- **Endpoint:** `POST /address` (Create/Edit/Delete)
- **Body (Create):**
  ```json
  {
    "action": "create",
    "userId": "uuid",
    "label": "Home",
    "name": "John Doe",
    "phone": "9876543210",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "isDefault": true
  }
  ```

### Admin: User List
- **Endpoint:** `GET /admin/users`
- **Query:** `?search={term}&status={active|blocked}`

### Admin: Block User
- **Endpoint:** `POST /admin/users/{id}`
- **Body:** `{ "action": "block", "reason": "Suspicious activity" }`

---

## 6. Coupons & Rewards

### List Coupons
- **Endpoint:** `GET /coupons`
- **Query:** `?active=true`

### Validate Coupon
- **Endpoint:** `POST /coupons/validate`
- **Body:**
  ```json
  {
    "code": "SAVE10",
    "userId": "uuid",
    "cartTotal": 1000,
    "items": [...]
  }
  ```

### Get Reward Balance
- **Endpoint:** `GET /rewards`
- **Query:** `?userId={uuid}`

### Calculate Rewards
- **Endpoint:** `POST /rewards`
- **Body:** `{ "action": "calculate", "userId": "uuid", "cartTotal": 500 }`

---

## 7. Reviews

### List Product Reviews
- **Endpoint:** `GET /product/{id}/review`
- **Response:** Reviews list + Rating breakdown stats

### Submit Review
- **Endpoint:** `POST /product/{id}/review`
- **Body:**
  ```json
  {
    "action": "create",
    "userId": "uuid",
    "rating": 5,
    "title": "Great product",
    "comment": "Loved it!",
    "images": ["url1", "url2"]
  }
  ```

### Admin: Moderate Reviews
- **Endpoint:** `POST /product/{id}/review`
- **Body:** `{ "action": "approve", "reviewId": "uuid" }`

---

## 8. Subscriptions

### List Plans
- **Endpoint:** `GET /subscriptions`
- **Query:** `?activeOnly=true`

### User Subscriptions
- **Endpoint:** `GET /subscriptions`
- **Query:** `?userId={uuid}&type=active`

### Subscribe
- **Endpoint:** `POST /subscriptions`
- **Body:**
  ```json
  {
    "action": "subscribe",
    "userId": "uuid",
    "subscriptionId": "uuid",
    "addressId": "uuid",
    "paymentMethod": "wallet",
    "startDate": "2025-01-01"
  }
  ```

---

## 9. Notifications

### List Notifications
- **Endpoint:** `GET /notifications`
- **Query:** `?userId={uuid}&unreadOnly=true`

### Mark Read
- **Endpoint:** `POST /notifications`
- **Body:** `{ "action": "markread", "notificationId": "uuid" }`

---

## 10. Admin Reports

### Dashboard
- **Endpoint:** `GET /admin/reports`
- **Query:** `?type=dashboard`

### Sales Report
- **Endpoint:** `GET /admin/reports`
- **Query:** `?type=sales&fromDate=2025-01-01&toDate=2025-01-31`

### Product Performance
- **Endpoint:** `GET /admin/reports`
- **Query:** `?type=products`

---

## 11. Payment Integration

### Initiate Payment
- **Endpoint:** `POST /payment`
- **Body:** `{ "action": "initiate", "orderId": "uuid" }`

### Verify Payment
- **Endpoint:** `POST /payment`
- **Body:** `{ "action": "verify", "orderId": "uuid", "paymentId": "pay_123", "signature": "sig_123" }`
