# Ruhvi Services Status Report

Below is a detailed breakdown of the various services and integrations within the Ruhvi platform, reflecting their current operational status after the recent restorations and optimizations.

## 1. Authentication & Security Services

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **Firebase Auth** | 🟢 **Active** | Core authentication provider. Fully operational. |
| **Firebase Email Verification** | 🔴 **Inactive (Removed)** | Intentionally removed to prevent broken `/__/auth/action` links and conflicts with the custom verification flow. |
| **Supabase Custom Auth** | 🟢 **Active** | Successfully bridges Firebase tokens to Supabase for RLS access. |
| **Referral Tracking System** | 🟢 **Active** | Fixed and fully integrated across Email, Phone, Google, and Facebook signups. Cookies are now properly tracked and converted. |

## 2. Email & Communication Services

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **Resend** | 🟢 **Active** | **Restored!** Exclusively handling all Transactional / Notification emails (order confirmations, shipping, passwords, support). |
| **Brevo (Sendinblue)** | 🟢 **Active** | Restricted solely to Marketing, Newsletters, and CRM campaigns. Removed from all transactional routes. |
| **WhatsApp Business API** | 🟢 **Active** | Operational for messaging campaigns and order updates via the Meta Graph API. |

## 3. Analytics & Monitoring 

> [!WARNING]
> **Performance Note:** All five of the analytics tools below are currently loading on every page. As noted in the Performance Audit, consolidating these (e.g., relying solely on PostHog) will significantly improve your website's initial load speed.

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **PostHog** | 🟢 **Active** | Product analytics and session recording. Working as expected. |
| **Google Analytics (GA4)** | 🟢 **Active** | E-commerce event tracking. Working as expected. |
| **Meta Pixel** | 🟢 **Active** | Ad conversion tracking. Working as expected. |
| **Microsoft Clarity** | 🟢 **Active** | Heatmap & session recording. Working as expected. |
| **Vercel SpeedInsights** | 🟢 **Active** | Real-user performance monitoring. Working as expected. |
| **Sentry** | 🟢 **Active** | Error tracking and debugging. Operational across edge and server. |

## 4. Push Notifications

> [!WARNING]
> **Duplicate Systems:** Both FCM and OneSignal are currently initializing on page load. It is highly recommended to remove OneSignal and stick exclusively to FCM to reduce javascript bundle size.

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **Firebase Cloud Messaging (FCM)** | 🟢 **Active** | Push notification service. Operational. |
| **OneSignal** | 🟢 **Active** | Secondary push notification service. Currently overlapping with FCM. |

## 5. E-Commerce & Logistics

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **PhonePe** | 🟢 **Active** | Payment gateway. Operational. |
| **Shiprocket** | 🟢 **Active** | Shipping & fulfillment. Webhooks and order creation operational. |
| **Cloudinary** | 🟢 **Active** | Image CDN. Operational. |

## 6. Support & AI Services

| Service | Status | Remarks & Update Details |
| :--- | :--- | :--- |
| **EspoCRM** | 🟢 **Active** | Hosted via Docker, syncing bi-directionally with Supabase. |
| **In-App AI Chatbot ("Gia")** | 🟢 **Active** | Operational globally. *(Note: Lazy-loading this widget in the future will improve performance).* |
| **Multi-Provider AI Engine** | 🟢 **Active** | Orchestrating requests across Gemini, OpenAI, Claude, and DeepSeek with active fallback routing. |
