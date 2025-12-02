## Combined Scope of Work for Food E-Commerce Platform Development

This document outlines all key modules, features, and deliverables for developing a comprehensive Food E-Commerce platform, including:

- **Admin Panel**
- **User Website**
- **User Mobile Apps (Android and iOS)**

The platform will support:

- **Product catalog management**
- **User authentication via OTP (with 90-day session persistence)**
- **Ordering and checkout**
- **Delivery integration with 3 third-party APIs**
- **Subscriptions as recurring orders**
- **Rewards as discounts**
- **Analytics and reporting**

It emphasizes secure, user-friendly experiences with integrations for:

- **MSG91 SMS** (OTP-based authentication)
- **Google Maps API** (address input, validation, and geolocation)
- **One payment gateway** (methods: UPI, wallet, credit card, net banking, COD; no credit card saving)
- **Delivery APIs** (auto-created jobs, agent assignment, and order status updates)

**Explicitly excluded** from the current scope:

- Gift hampers
- User forgot password / reset password flows (authentication relies solely on OTP via MSG91 with 90-day session persistence)
- Support ticket raising module
- Separate admin delivery management module (delivery is managed via integrated partner APIs)
- Timelines, milestones, or estimated efforts

---

## 1. Project Setup & Planning

- **UI/UX Design**
  - Create intuitive designs for Admin panel, User Website, and User Mobile Apps.

- **Initial Setup**
  - Establish the project environment, including servers, databases, and development tools.

- **Architecture Design**
  - Design the overall system architecture for scalability, security, and performance.
  - Support OTP authentication, subscriptions as recurring orders, rewards as discounts, and multiple delivery integrations.

- **Requirement Analysis**
  - Analyze and document all functional and non-functional requirements.

---

## 2. Authentication & Profile Management

- **Admin Authentication**
  - Secure login and logout system.
  - Forgot password functionality.
  - Reset password functionality.

- **User Authentication & Profile (Website + Mobile Apps)**
  - Sign up and login via OTP (integrated with MSG91 for SMS delivery); session persists for 90 days.
  - Logout system.
  - Edit Profile: Update name, phone, email, DOB, and address.

---

## 3. Product Catalog Management

- **Admin Product Catalog Management**
  - Separate module for Categories & Subcategories:
    - Add/Edit/Delete categories and subcategories.
    - Upload icons.
  - Separate module for Custom Product Tags:
    - Add/Edit/Delete custom tag categories and individual tags.
    - Tags appear as dropdowns in product add/edit screens.
  - Product Add/Edit/Delete:
    - Title, SKU, price, description.
    - Tags via dropdown.
    - GST inclusion status.
  - Manage product variants (quantity, packaging).
  - Upload multiple images for products, categories, and subcategories.
  - Mark product availability (in stock/out of stock).
  - Enter quantity.
  - Set product visibility (active/inactive).
  - Add nutritional information and allergen tags.
  - Add/Edit/Delete product-specific FAQ sections.
  - Option to mark products as **featured** and **best seller**.

- **User Home & Discovery (Website + Mobile Apps)**
  - Dynamic banners for offers and categories (managed by Admin via CMS).
  - Featured products and best sellers.
  - Category-wise browsing.
  - Search with AutoFill.
  - Filters:
    - By price
    - By dietary tags
  - Sort:
    - By price
    - By rating

- **User Product Details (Website + Mobile Apps)**
  - Display product name, price, availability, images, description.
  - Show nutritional details and FAQ section.
  - Show ratings and reviews (product reviews only, activated post-delivery).
  - Add to cart / Buy now options.

---

## 4. Offers, Discounts, User Management, and Rewards

- **Admin Offers & Discounts**
  - Fully managed module: Add/Edit/Delete coupons.
  - Configure usage limits, expiration dates, and eligibility (e.g., minimum order amount, user group).
  - Apply discounts to specific products or categories.

- **Admin User Management**
  - View all registered users.
  - View individual user’s order history.
  - Block/unblock users.

- **Admin Reward System Management**
  - Configure rewards as discounts (e.g., based on number of orders; admin decides coupon availability).
  - Manage discount coupons for rewards via the discounts module.
  - View and adjust user reward balances.

- **User Reward System (Website + Mobile Apps)**
  - Earn rewards (as discounts) automatically on order placement.
  - View reward balance and history.
  - Redeem rewards during checkout.

---

## 5. Address Management and Cart & Checkout

- **User Address Book (Website + Mobile Apps)**
  - Add/Edit/Delete addresses.
  - Integrated with Google Maps API for:
    - Address input
    - Validation
    - Geolocation
  - Label addresses (e.g., Home, Work, Other).

- **User Cart & Checkout (Website + Mobile Apps)**
  - Update quantity and remove items.
  - Apply coupons (including reward-based discounts).
  - Choose delivery address (with Google Maps integration for accuracy).
  - Choose payment method:
    - UPI
    - Wallet
    - Credit card
    - Net banking
    - COD
  - Integration with one payment gateway.
  - No saving of credit card details.
  - Display available payment options.
  - View final breakdown:
    - Items
    - Tax
    - Delivery charge
    - Discount

---

## 6. Delivery Integration and Management

- **Admin Integrated Delivery Partner API Features (Integrated, No Separate Module)**
  - Support for **3 delivery partner APIs**.
  - Auto-create delivery job via API on order placement.
  - Auto-assignment of delivery agent via API.
  - Track delivery status via webhook/API, with automatic order status updates from APIs.
  - Manage serviceable pin codes.

---

## 7. Order Management and Tracking

- **Admin Order Management**
  - Order dashboard with filters:
    - Date
    - User
    - Status
    - Product
  - View order details (items, total, delivery info).
  - Manual order status updates (confirmed, packed, dispatched), supplemented by automatic updates from delivery APIs.
  - Cancel order (if not dispatched).
  - Print invoice.
  - Assign or reassign delivery via 3 third-party partner APIs.

- **User Order Management (Website + Mobile Apps)**
  - View past orders.
  - Download invoice.
  - Track delivery status.
  - Cancel order (if not dispatched).

- **User Delivery Tracking (Website + Mobile Apps)**
  - Show delivery status (updated via APIs).
  - Show ETA (via third-party API, if available).

- **User Notification Settings (Website + Mobile Apps)**
  - Option to turn on/off notifications.

---

## 8. Subscription Management

- **Admin Subscription Management**
  - Create/Edit/Delete custom subscriptions.
  - Add items to subscriptions.
  - Set frequency (e.g., weekly, monthly, custom), timeline, and cost.
  - Manage as recurring orders, handling each frequency instance (e.g., auto-generate orders per cycle).
  - Manage invite-based access (e.g., generate and send invites to select users).

- **User Subscriptions (Website + Mobile Apps, Invite-Only)**
  - View and subscribe to invited subscriptions.
  - Manage active subscriptions (e.g., pause, cancel).
  - Automatic order creation based on subscription frequency.

---

## 9. Content Management, Blog, Reports, Notifications, and Feedback

- **Admin Content Management (CMS)**
  - Homepage banners management (for dynamic user home banners).
  - Featured products and best sellers management.
  - Blog creation, editing, and deletion:
    - Titles
    - Content
    - Images
    - Publishing status

- **Admin Reports & Analytics**
  - Order reports.
  - User reports.
  - Inventory reports.
  - Product analytics:
    - Most ordered products
    - Least ordered products
    - Most consumed/used product
    - Product with best reviews
  - Customer analytics:
    - City with highest orders
    - Highest paying customers
    - Loyal customers

- **User Notifications & Alerts (Website + Mobile Apps)**
  - Push, in-app, and email notifications for:
    - Offers/promotions
    - Order/delivery status
    - ETA changes/delays
    - Subscription reminders
    - Reward updates

- **User Reviews & Feedback (Website + Mobile Apps)**
  - Submit product reviews and ratings (activated only after product delivery).
  - Submit shopping experience reviews (visible to admin only).

- **Admin Review Management**
  - Dedicated module to approve/reject all reviews (product and shopping experience) before going live.
  - Product reviews:
    - Displayed on user side if approved.
  - Shopping experience reviews:
    - Shown to admin only.

---

## 10. Hosting and Deployment

- Host the Admin panel and User Website.
  - If our server is chosen, the cost will be additional.

- Deploy the Mobile Apps (Android and iOS) to respective stores and make them live using client-provided developer accounts.

---

## 11. Client-Provided Requirements

To enable successful execution of the project, the client must provide the following:

- **Third-Party APIs (Procured by Client)**
  - MSG91 API: Credentials and access for SMS-based OTP authentication.
  - Google Maps API: Credentials for address input, validation, and geolocation.
  - Payment Gateway API: Credentials for one payment gateway supporting UPI, wallet, credit card, net banking, and COD.
  - Delivery Partner APIs: Credentials and documentation for 3 delivery partner APIs for order creation, agent assignment, status tracking, and ETA (if available).

- **Developer Accounts**
  - Android Developer Account for Google Play Store to deploy and make the Android app live.
  - Apple Developer Account for App Store to deploy and make the iOS app live.

- **Content and Assets**
  - Initial content for blogs, banners, and product images/icons, details (if specific assets are required; otherwise, placeholder content can be used during development).

- **Testing and Validation**
  - Access to test accounts or environments for third-party APIs (e.g., sandbox modes for payment and delivery APIs).
  - Client feedback and approval during UI/UX design and testing phases.

---

## 12. Out of Scope

The following features are explicitly excluded from the current scope:

- Gift Hampers: Marked as a post-MVP feature and not included.
- User Forgot Password and Reset Password Functionalities:
  - Removed, with user authentication relying solely on OTP login via MSG91 with 90-day session persistence.
- Raise Ticket Support:
  - Excluded, meaning no user or admin functionality for raising or managing support tickets.


