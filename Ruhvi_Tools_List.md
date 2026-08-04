# Ruhvi E-commerce - Tool & Technology Stack

This document outlines all the major tools, services, and technologies currently integrated into the Ruhvi E-commerce platform, categorized by their primary function.

---

### Core Framework & Development
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Next.js (App Router)** | Primary React framework for building the user interface, server-side rendering, and static generation. | Active |
| **TypeScript** | Type-safe JavaScript for robust and maintainable code. | Active |
| **Tailwind CSS** | Utility-first CSS framework for styling the application. | Active |

### Database & Authentication
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Supabase** | Primary PostgreSQL database, user sessions, data fetching, and storage for site data. | Active |
| **Firebase Auth** | Manages OTP (Phone) login to supplement Supabase authentication. | Active |

### E-commerce & Logistics
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **PhonePe** | Primary payment gateway for checkout (UPI, Cards, Netbanking). | Setup Pending |
| **Shiprocket** | Logistics partner for courier assignment, label generation, and order sync. | Partially Implemented |

### Communications & Marketing
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Brevo** | Transactional emails and automated cron email campaigns (Welcome, Abandoned Cart, Win-back, Birthdays). | Active |
| **OneSignal Web Push** | Marketing and engagement push notifications (abandoned cart, flash sales) directly to browsers. | Active |
| **Firebase Cloud Messaging (FCM)** | System/Transactional push notifications (order updates, OTPs). | Active |
| **WhatsApp Business API (Meta)** | Sending order confirmations and shipping updates via WhatsApp. | Setup Pending |

### Media & Assets
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Cloudinary** | Hosting, serving, and dynamically optimizing product images. | Active |
| **Photoswipe** | Interactive image gallery for zooming and viewing product detail pages. | Active |

### Analytics & Performance
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Google Analytics 4** | General website traffic, user behavior, and e-commerce tracking. | Active |
| **Meta Pixel / CAPI** | Server-side and client-side conversion tracking for Meta (Facebook/Instagram) ads. | Active |
| **Vercel Speed Insights** | Real-world Web Vitals performance monitoring of the deployed app. | Active |

### Security & UI Utilities
| Tool | Purpose | Status |
| :--- | :--- | :--- |
| **Cloudflare Turnstile** | Invisible bot protection during checkout to prevent spam and abuse. | Active |
| **React Hook Form & Zod** | Form handling and strict schema validation (e.g., checkout, contact forms). | Active |
| **React Hot Toast** | Elegant toast notifications for user feedback across the app. | Active |

---
*Generated on August 2026*
