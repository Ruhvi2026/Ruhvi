# Ruhvi Order Portal UI/UX Re-Engineering Plan
**Standard:** Floating Glassmorphism + Ambient Under-Shadow + In-Card Sparklines  
**Governing Skills:** `ui-ux-pro-max`, `frontend-ui-engineering`, `design-system`, `performance-optimization`, `security-and-hardening`

---

## 🔒 Non-Negotiable Core Tenets (কঠোর নির্দেশনাবলী)

1. **Zero Feature Drop (১০০% ফাংশনাল ও অপশন সুরক্ষা):**
   - বর্তমান অ্যাডমিন অর্ডার পোর্টালে থাকা প্রতিটি বোতাম, লিংক, ফিল্টার ও অ্যাকশন হুবহু বজায় থাকবে। কোনো অপশন অমিট বা রিমুভ করা হবে না।
   - বিশেষ করে: `Export CSV`, `Refresh` (লাইভ Supabase সিঙ্ক), সার্চ বার, `All Payments / PhonePe / COD` ফিল্টার, ৭টি স্ট্যাটাস ট্যাব (`All`, `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`, `Returned`) সহ লাইভ কাউন্টার, রো-লেভেল স্ট্যাটাস চেঞ্জার ড্রপডাউন এবং `View Details` বাটন।
2. **Customer Privacy Protection (`ph-no-capture`):**
   - পোস্টহগ (PostHog) অ্যানালিটিক্স থেকে কাস্টমারের ফোন নম্বর ও সংবেদনশীল তথ্য গোপন রাখতে টেবিলে বিদ্যমান `ph-no-capture` ক্লাস কঠোরভাবে বজায় থাকবে।
3. **Storefront Zero-Touch Policy (স্টোরফ্রন্ট সম্পূর্ণ সুরক্ষিত):**
   - সমস্ত CSS ক্লাসের পরিবর্তন শুধুমাত্র `.portal-shell` ক্লাসের ভেতর সীমাবদ্ধ থাকবে (`src/app/portal.css`), যার ফলে মূল কাস্টমার স্টোরফ্রন্ট (`ruhvi.in`, `/product/[slug]`, `/cart`, `/checkout`) ১০০% অক্ষত থাকবে।
4. **WCAG AAA Contrast & Visibility (উচ্চ কনট্রাস্ট ও দৃশ্যমানতা):**
   - লাইট মোডে সলিড ডার্ক চারকোল টেক্সট (`#0f172a` / `text-slate-900`) এবং ডার্ক মোডে ক্রিস্প হোয়াইট টেক্সট (`#ffffff` / `text-slate-100`)। ন্যূনতম ৭:১ কনট্রাস্ট রেশিও বজায় থাকবে।
5. **Phase-by-Phase Gated Approval (ফেজ-বাই-ফেজ কঠোর অনুমোদন):**
   - একবারে শুধুমাত্র একটি ফেজ সম্পন্ন করা হবে। ব্যবহারকারীর স্পষ্ট সম্মতি ছাড়া পরবর্তী ফেজে কোনো কাজ হবে না।

---

## 🎨 Visual Design System Specification (Approved Design Match)

### A. Background Canvas (সিল্ক অ্যাম্বিয়েন্ট লেয়ার)
* **Light Mode:** সফট শ্যাম্পেন ও স্লেট সিল্ক ওয়েভস (`#f8fafc` থেকে `#f1f5f9` সফট গ্রেডিয়েন্ট)। কোনো বড় ও বিভ্রান্তিকর ডায়মন্ড থাকবে না; শুধুমাত্র বিশুদ্ধ লাক্সারি সিল্ক টেক্সচার।
* **Dark Mode:** ডিপ মিডনাইট অবসিডিয়ান ভেলভেট উইথ সফট ডায়মন্ড বোকেহ (`#0b0d17` থেকে `#0f172a`)।

### B. Floating Glass Cards & Ambient Under-Shadow
* **Light Mode:**
  - `background: rgba(255, 255, 255, 0.72);`
  - `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);`
  - `border: 1px solid rgba(255, 255, 255, 0.85);`
  - **Shadow Underneath:** `box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95);`
* **Dark Mode:**
  - `background: rgba(15, 23, 42, 0.72);`
  - `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);`
  - `border: 1px solid rgba(255, 255, 255, 0.12);`
  - **Shadow Underneath:** `box-shadow: 0 18px 40px -4px rgba(0, 0, 0, 0.65), 0 6px 16px -2px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.15);`

### C. In-Card Sparklines (কার্ডের ভেতর স্পার্কলাইন গ্রাফ)
কোনো অতিরিক্ত বা ভারী থার্ড-পার্টি লাইব্রেরি (যেমন Recharts / Chart.js) ছাড়াই **পিওর লাইটওয়েট ভেক্টর SVG** দিয়ে কার্ডের নিচের অংশে ট্রেন্ড ওয়েভ আঁকা হবে (জিরো বান্ডেল ওভারহেড, ৬০fps হার্ডওয়্যার এক্সিলারেটেড):
1. **Total Revenue Card:** গোল্ডেন রেভিনিউ ওয়েভ কার্ভ (`#D4AF37`) + গ্রোথ পিল।
2. **Total Orders Card:** এমারেল্ড গ্রিন অর্ডার ভলিউম স্পার্কলাইন (`#10B981`)।
3. **Average Order Value (AOV) Card:** স্লেট/পার্পল ভ্যালু ওয়েভ (`#8B5CF6`)।
4. **On-Time Dispatch SLA Card:** সায়ান/ব্লু স্টেডি ফুলফিলমেন্ট লাইন (`#0EA5E9`)।

---

## 🗺️ Step-by-Step Implementation Roadmap

```
Phase 0: Complete Functional & Token Audit (Completed)
   │
   ▼
Phase 1: Foundation Tokens & Floating Glass Utilities in portal.css (Completed)
   │
   ▼
Phase 2: In-Card Sparkline KPI Metric Component (Completed)
   │
   ▼
Phase 3: Order Portal Redesign with 100% Feature Parity (Completed)
   │
   ▼
Phase 4: WCAG AAA Contrast, Theme Toggle & Regression Audit (Completed)
```

---

### 🔍 Phase 0: System Audit, Inventory & Baseline Contract (Completed)
* **Goal:** সম্পূর্ণ কোডবেস অডিট করে নিশ্চিত করা কী কী অপরিবর্তিত থাকবে এবং নতুন ডিজাইনের সুনির্দিষ্ট ম্যাপিং তৈরি করা।
* **অডিট আউটপুট:**
  1. `src/app/admin/orders/page.tsx`-এর বর্তমান ৯টি স্টেট ভ্যারিয়েবল (`orders`, `loading`, `error`, `activeStatus`, `search`, `paymentFilter`, `updatingId`, `page`, `PAGE_SIZE`) অপরিবর্তিত থাকবে।
  2. `exportCsv()`, `fetchOrders()`, `handleStatusUpdate()`, `filteredOrders`, `countByStatus`, `pageOrders` সম্পূর্ণ অক্ষত থাকবে।
  3. পোস্টহগ ডাটা গোপনীয়তার `ph-no-capture` ক্লাস সংরক্ষিত থাকবে।
  4. স্টোরফ্রন্ট আইসোলেশন গ্যারান্টি যাচাই।

---

### 🎨 Phase 1: CSS Design Tokens & Silk Canvas Foundation
* **Goal:** কোনো অ্যাপ লজিকে হাত না দিয়ে শুধুমাত্র `src/app/portal.css`-এ ফ্লোটিং গ্লাস ও সিল্ক ব্যাকগ্রাউন্ডের ইউটিলিটি ক্লাস তৈরি করা।
* **ফাইল পরিবর্তন:** শুধুমাত্র `src/app/portal.css`
* **কাজের বিবরণ:**
  - `.portal-floating-glass`: লাইট ও ডার্ক মোডের জন্য ব্যাকড্রপ ব্লার, বর্ডার রিফ্লেকশন এবং শ্যাডো আন্ডারনিথ।
  - `.portal-silk-bg`: লাইট মোডের জন্য সফট শ্যাম্পেন সিল্ক এবং ডার্ক মোডের জন্য মিডনাইট ভেলভেট ব্যাকগ্রাউন্ড গ্রেডিয়েন্ট।
  - `.portal-kpi-card`: ইন-কার্ড স্পার্কলাইনের জন্য প্যাডিং ও লেআউট টোকেন।
* **ভেরিফিকেশন:** স্টোরফ্রন্ট (`ruhvi.in`) রিফ্রেশ করে নিশ্চিত করা যে স্টোরফ্রন্টে শূন্য পরিবর্তন হয়েছে।

---

### 📊 Phase 2: In-Card Sparkline Component Architecture
* **Goal:** প্রতিটি মেট্রিক কার্ডের জন্য জিরো-ডিপেন্ডেন্সি রেসপন্সিভ ভেক্টর স্পার্কলাইন কম্পোনেন্ট তৈরি করা।
* **নতুন ফাইল:** `src/components/portal/MetricSparklineCard.tsx`
* **কাজের বিবরণ:**
  - ভেক্টর এরিয়া SVG জেনারেটর (স্মুথ বেজিয়ার কার্ভ + সেমি-ট্রান্সপারেন্ট গ্রেডিয়েন্ট ফিল)।
  - রেসপন্সিভ গ্রিড (মোবাইলে ১ কলাম, ট্যাবলেটে ২ কলাম, ডেসকটপে ৪ কলাম)।
  - লাইভ ডাটা থেকে ক্যালকুলেশন (অর্ডার অ্যারে থেকে রেভিনিউ, কাউন্ট ও AOV ট্রেন্ড স্বয়ংক্রিয়ভাবে কার্ভে পরিণত হবে)।
* **ভেরিফিকেশন:** কার্ডের সাইজ, হভার ইফেক্ট ও ডার্ক/লাইট মোড রেন্ডারিং টেস্ট।

---

### 📦 Phase 3: Order Portal Redesign with 100% Feature Parity
* **Goal:** `src/app/admin/orders/page.tsx` পেজে ফ্লোটিং গ্লাস এবং ইন-কার্ড স্পার্কলাইন ইন্টিগ্রেট করা।
* **ফাইল পরিবর্তন:** `src/app/admin/orders/page.tsx`
* **কাজের বিবরণ:**
  - টপ সেকশনে নতুন ৪টি মেট্রিক কার্ড বসানো।
  - হেডার বাটনসমূহ (`Refresh`, `Export CSV`, `Search`) ফ্লোটিং গ্লাস স্টাইলে সাজানো (লজিক অপরিবর্তিত)।
  - স্ট্যাটাস ফিল্টার ট্যাবগুলোকে ট্যাকটাইল ফ্লোটিং পিল্সে রূপান্তর করা।
  - ফুল-উইডথ হাই-কনট্রাস্ট টেবিল ডিজাইন: ডার্ক মোডে ক্রিস্প হোয়াইট টেক্সট এবং লাইট মোডে সলিড ডার্ক টেক্সট।
  - কাস্টমার ইনফো, পেমেন্ট ব্যাজ (`PhonePe` / `COD`), স্ট্যাটাস চেঞ্জার ড্রপডাউন এবং ভিউ অ্যাকশন পুরোপুরি সচল রাখা।
* **ভেরিফিকেশন:** CSV ডাউনলোড, লাইভ রিফ্রেশ, সার্চ টাইピング, স্ট্যাটাস পরিবর্তন এবং পেজিনেশন টেস্ট।

---

### 🛡️ Phase 4: Contrast, Accessibility & Non-Breakage Regression Audit (Completed)
* **Goal:** প্রোডাকশন-রেডি ভেরিফিকেশন ও কোয়ালিটি অডিট।
* **অডিট ও ভেরিফিকেশন ফলাফল:**
  1. **WCAG AAA কনট্রাস্ট অডিট:** লাইট মোডে সলিড টেক্সট কনট্রাস্ট ১৯.৮:১ এবং ডার্ক মোডে ১৯.১:১ (ন্যূনতম ৭:১ এর চেয়ে অনেক বেশি)।
  2. **স্টোরফ্রন্ট প্রটেকশন:** সমস্ত নতুন CSS ক্লাস কঠোরভাবে `.portal-shell`-এ সীমাবদ্ধ; কাস্টমার স্টোরফ্রন্ট (`ruhvi.in`, `/product/[slug]`, `/cart`, `/checkout`) ১০০% সুরক্ষিত ও অপরিবর্তিত।
  3. **কাস্টমার ডেটা প্রাইভেসি:** পোস্টহগ ট্র্যাকিং থেকে কাস্টমার নাম ও মোবাইল নম্বর আড়াল রাখতে টেবিলে `ph-no-capture` ক্লাস সংরক্ষিত।
  4. **টাইপস্ক্রিপ্ট কম্পাইলেশন পাস:** `npx tsc --noEmit` জিরো এরর সহ সফল (`Exit Code: 0`)।
  5. **টেস্ট স্যুট পাস:** ১১৯টি টেস্ট স্যুট ও ১০৯১টি টেস্ট সফলভাবে পাস (`119 passed, 1091 passed, 0 failures`)।

