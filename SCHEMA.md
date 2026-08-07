# Ruhvi Master Database Schema Reference (`SCHEMA.md`)

This document is the authoritative database reference for **Ruhvi.in — Fine Jewellery Ecommerce Platform**, reflecting all 8 SQL database migrations executed across Phases 1 through 8.

---

## 1. Core Platform & Users (`0001_phase1_initial_schema.sql`)

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, DEFAULT `gen_random_uuid()` | User ID linked to Supabase Auth |
| `email` | `text` | UNIQUE, NOT NULL | Customer/Staff email |
| `full_name` | `text` | | User full name |
| `phone` | `text` | | Contact number |
| `role` | `text` | DEFAULT `'customer'` | `'customer'` or `'admin'` |
| `created_at` | `timestamptz` | DEFAULT `now()` | Registration timestamp |

### `addresses`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, DEFAULT `gen_random_uuid()` | Address record ID |
| `user_id` | `uuid` | FK -> `users.id` | Belongs to user |
| `label` | `text` | DEFAULT `'Home'` | E.g., Home, Work |
| `full_name` | `text` | NOT NULL | Recipient name |
| `phone` | `text` | NOT NULL | Recipient phone |
| `line1` | `text` | NOT NULL | Address street / flat |
| `line2` | `text` | | Apartment / Landmark |
| `city` | `text` | NOT NULL | City |
| `state` | `text` | NOT NULL | State |
| `pincode` | `text` | NOT NULL | 6-digit PIN code |
| `is_default` | `boolean` | DEFAULT `false` | Default shipping address |

---

## 2. Product Catalog (`0002_phase2_catalog.sql`)

### `categories`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Category ID |
| `name` | `text` | NOT NULL | E.g., Rings, Necklaces |
| `slug` | `text` | UNIQUE, NOT NULL | URL-friendly slug |
| `image_url` | `text` | | Banner image |

### `products`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Product ID |
| `name` | `text` | NOT NULL | Product title |
| `slug` | `text` | UNIQUE, NOT NULL | URL slug |
| `description` | `text` | | Detailed product copy |
| `price` | `numeric` | NOT NULL | Selling price (INR) |
| `gold_purity` | `text` | DEFAULT `'18K'` | Gold karatage (14K/18K/22K) |
| `huid_code` | `text` | | 6-digit BIS Hallmarking HUID |
| `images` | `jsonb` | NOT NULL | Array of image URLs |
| `stock` | `integer` | DEFAULT 0 | Stock inventory level |

---

## 3. Orders & Money Features (`0004_phase4_money_features.sql`, `0005_phase5_shipping.sql`)

### `orders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Order UUID |
| `order_number` | `text` | UNIQUE, NOT NULL | E.g. `RHV-2026-8942` |
| `user_id` | `uuid` | FK -> `users.id` | Buyer ID |
| `status` | `text` | DEFAULT `'confirmed'` | Status |
| `total` | `numeric` | NOT NULL | Final paid amount |
| `shiprocket_order_id` | `text` | | Shiprocket ID |
| `awb_code` | `text` | | Courier AWB Tracking Code |
| `courier_name` | `text` | | Assigned Courier |

### `tracking_updates`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Update ID |
| `order_id` | `uuid` | FK -> `orders.id` | Associated order |
| `awb_code` | `text` | NOT NULL | Tracking AWB |
| `status` | `text` | NOT NULL | Current status |
| `activity` | `text` | NOT NULL | Log activity text |
| `timestamp` | `timestamptz` | DEFAULT `now()` | Scan time |

---

## 4. Marketing & Security (`0007_phase6_marketing.sql`, `0008_phase8_security_audit.sql`)

### `blog_posts`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Post ID |
| `title` | `text` | Article headline |
| `slug` | `text` | URL slug |
| `content` | `text` | Markdown/HTML body |

### `testimonials`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Testimonial ID |
| `customer_name` | `text` | Reviewer name |
| `rating` | `integer` | 1 to 5 stars |
| `video_url` | `text` | UGC video attachment |
| `is_verified_purchase` | `boolean` | Verification trust badge |

### `audit_logs`
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Audit log ID |
| `user_id` | `uuid` | Performing admin ID |
| `action` | `text` | Action (e.g. `SHIPMENT_CREATED`) |
| `entity` | `text` | Affected entity table |
| `ip_address` | `text` | Client IP address |
| `details` | `jsonb` | Metadata JSON |

---

## 5. AI Infrastructure & Temporary Diagnostics (`0011_phase11_ai_logs.sql`, `0026_failure_diagnostics_ttl.sql`)

### `ai_logs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, DEFAULT `gen_random_uuid()` | Generation record ID |
| `provider` | `text` | NOT NULL | Executing provider |
| `model` | `text` | NOT NULL | Model identifier |
| `feature` | `text` | NOT NULL | Target AI feature key |
| `tokens_used` | `integer` | DEFAULT 0 | Tokens billed |
| `estimated_cost` | `numeric(10,6)` | DEFAULT 0 | Cost in USD |
| `status` | `text` | NOT NULL | `'success'` or `'failed'` |
| `error_message` | `text` | | Error stack |
| `user_identifier` | `text` | | User ID or Anonymous IP |
| `created_at` | `timestamptz` | DEFAULT `now()` | Generation timestamp |

### `ai_failure_diagnostics` (24-Hour TTL Auto-Purge)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, DEFAULT `gen_random_uuid()` | Diagnostic trace UUID |
| `feature` | `text` | NOT NULL | AI feature key |
| `primary_provider` | `text` | NOT NULL | Initial configured provider |
| `failed_provider` | `text` | NOT NULL | Provider where failure was caught |
| `fallback_provider` | `text` | | Provider that recovered generation |
| `model` | `text` | | Model identifier |
| `error_message` | `text` | NOT NULL | Failure reason |
| `error_type` | `text` | DEFAULT `'GENERAL_FAILURE'` | E.g. `RATE_LIMIT_EXCEEDED`, `TIMEOUT` |
| `stack_trace` | `text` | | Technical stack trace |
| `user_identifier` | `text` | | Client identifier |
| `user_role` | `text` | DEFAULT `'guest'` | Role: `guest`, `user`, `staff`, `manager`, `admin` |
| `latency_ms` | `integer` | DEFAULT 0 | Failover resolution time (ms) |
| `attempt_number` | `integer` | DEFAULT 1 | Attempt hop in fallback chain |
| `recovery_status` | `text` | NOT NULL | `'recovered'`, `'exhausted'`, `'retrying'` |
| `metadata` | `jsonb` | DEFAULT `'{}'::jsonb` | Telemetry payload metadata |
| `created_at` | `timestamptz` | DEFAULT `now()` | Generation timestamp |
| `expires_at` | `timestamptz` | DEFAULT `now() + interval '24 hours'` | **Automatic 24h TTL expiration** |

