# Ruhvi — Luxury Jewelry E-Commerce Design System

> **Do not change the HTML design. Keep `index.html` exactly as it is.**
> This document describes the design system that `index.html` implements, and
> the fuller storefront it belongs to. It is a reference for extending the
> experience — not an instruction to modify the existing homepage.

## Brief

Design a complete premium luxury jewelry e-commerce website UI for the Ruhvi
brand: a polished, production-quality experience built on a sophisticated
cream/ivory foundation with refined champagne-gold accents, elegant
typography, premium editorial imagery, generous whitespace, subtle borders,
soft shadows, refined cards, and an upscale luxury aesthetic — using a modern
Bento Grid-based layout system wherever appropriate, while staying elegant,
balanced, editorial, and highly premium rather than overly decorative. The
design should feel like a high-end contemporary jewelry brand: minimal,
luxurious, sophisticated, feminine, visually rich, and trustworthy — a
cohesive UI system across the full experience, including the main storefront,
navigation, product discovery, collections, product presentation, shopping
experience, customer account areas, and supporting interface sections.

## Implementation status

| Area | Status |
|---|---|
| Storefront homepage (`index.html`) | **Built** — see below |
| Navigation shell (header, icons, sticky behavior) | **Built** — homepage header only |
| Product discovery / category browsing (full listing page) | Not yet built |
| Collections pages | Not yet built |
| Product detail / presentation page | Not yet built |
| Shopping cart / checkout flow | Not yet built |
| Customer account areas | Not yet built |
| Supporting sections (search results, wishlist page, footer nav, 404, etc.) | Not yet built |

Everything below documents the system as realized in `index.html`, plus how
it's intended to extend to the sections not yet built, so future work stays
consistent with what already exists rather than introducing a second visual
language.

---

## 1. Visual foundation

### Color palette

Defined as CSS custom properties in `:root`, used throughout rather than
hardcoded per-component:

| Token | Hex | Role |
|---|---|---|
| `--cream` | `#F7F1E7` | Primary background |
| `--cream-deep` | `#EFE6D5` | Secondary surfaces, hover states, subtle fills |
| `--ink` | `#2A2118` | Primary text |
| `--ink-soft` | `#4A3F33` | Secondary/body text |
| `--gold` | `#C79A4B` | Accent, eyebrow labels |
| `--gold-deep` | `#A87C2E` | Links, CTAs, brand wordmark |
| `--gold-pale` | `#E9C989` | Light accent, text-on-dark |
| `--brown-dark` | `#1C140D` | Dark section backgrounds (hero, banners) |
| `--brown-mid` | `#2E2115` | Dark gradient stops |
| `--line` | `rgba(42,33,24,0.12)` | Hairline borders |

This is a warm, restrained palette — no saturated colors, no pure black or
white — which is what reads as "premium" rather than "loud" for jewelry.
Dark sections (hero, Limited Collection, CTA strip) use `--brown-dark` rather
than black, keeping the warmth consistent even where contrast is highest.

### Typography

Three typefaces, each with a distinct job:

- **Marcellus** (`.display`) — display serif for headlines and the brand
  wordmark. Used at low letter-spacing for headlines, wide letter-spacing
  (`0.28em`) for the "RUHVI" logotype.
- **Cormorant Garamond** (`.serif`) — italic accent serif for secondary
  headlines and category titles (e.g. "Elegant & Timeless"). Its italic
  gives the feminine, editorial quality the brief calls for without adding
  visual weight.
- **Jost** — body sans-serif for UI text, labels, and buttons. Clean and
  neutral so it doesn't compete with the two serif faces.

Loaded via Google Fonts with `preconnect` hints for performance.

### Spacing, borders, shadows

- Section corner radius: `16–22px` depending on scale (cards use `16px`,
  hero/banner sections use `22px`).
- Borders are hairline (`1px solid var(--line)`) — never heavy.
- Shadows are soft and warm-toned (e.g. `0 8px 20px -8px rgba(167,124,46,0.6)`
  on the primary button) rather than neutral grey, tying shadows back into
  the gold palette instead of looking like a generic UI kit.
- A single `--maxw: 1180px` constrains content width across every section
  via a shared `.wrap` container, keeping margins consistent site-wide.

---

## 2. Layout system — Bento Grid

The brief calls for "a modern Bento Grid-based layout system wherever
appropriate." On the homepage this shows up as three distinct grid moments,
each a different bento rhythm rather than one repeated pattern:

1. **Two-up promo row** (`.promo-row`) — New Arrivals / Best Sellers.
   Equal-width cards, `grid-template-columns: 1fr 1fr`, collapsing to a
   single column on mobile.
2. **Four-up category grid** (`.cat-grid`) — Rings / Earrings / Necklaces /
   Bracelets. Full-bleed photo cards with overlaid text, `2×2` on desktop
   and tablet, staying `2×2` down to small mobile widths rather than
   collapsing to a single column, since each card is tall enough to read
   well at that width.
3. **Asymmetric split** (`.split`) — the "For every you" section pairs a
   text panel with a full-height image panel in a `1fr 1fr` grid that
   drops to a single column (image first, via `order:-1`) below `880px`.

Each grid uses a consistent `16–18px` gap, so the rhythm feels intentional
across sections even though the column counts differ.

**Extending the system:** a full product listing / collection page should
reuse the same bento logic — not a plain uniform product grid. For example,
feature one larger "editor's pick" tile spanning 2 columns among smaller
uniform product tiles, echoing the homepage's mix of full-bleed category
cards and smaller promo cards rather than introducing a flat e-commerce grid
that would feel like a different site.

---

## 3. Navigation

Sticky header (`position: sticky`, `backdrop-filter: blur(10px)`) with a
translucent cream background so page content is dimly visible scrolling
underneath it — a refined touch rather than a hard opaque bar.

Three-zone layout: hamburger menu on the left, centered "RUHVI / JEWELS"
wordmark with a small gold sparkle glyph above it, and search / wishlist /
cart icons on the right. The cart icon carries a small gold count badge.

Icon buttons share one `.icon-btn` treatment (40px circle, subtle background
and lift on hover) so every icon in the header behaves identically —
important for a system that will need more icons (account, filters) as
discovery pages are built.

**Extending the system:** deeper pages (category listing, product detail,
account) should keep this exact header — same sticky behavior, same
three-zone layout — and add a secondary sub-navigation row beneath it
(breadcrumbs, category tabs, or filter bar) rather than modifying the
primary header itself.

---

## 4. Core components

Every interactive element on the homepage is one of four repeated patterns,
not a one-off per section:

- **`.pill-btn`** — primary call-to-action. Gold gradient fill, fully
  rounded, small arrow icon, lifts on hover with a soft gold-tinted shadow.
  Used for "Explore Collection," "Explore All."
- **`.shop-now`** — secondary/tertiary link. Underlined gold text with an
  arrow that nudges further right on hover. Used inside every card so
  browsing never requires a heavy button — appropriate for a luxury context
  where restraint reads as confidence.
- **Full-bleed image cards** (`.promo-card`, `.cat-card`, `.limited`) — a
  photo fills the card, a bottom-anchored gradient scrim (tuned per section
  so the product/subject stays visible in the clear upper portion) sits
  behind overlaid label/title/link text. This is the dominant card pattern
  on the page and is the one to reuse for any future product tile.
- **`.trust-item`** — icon-in-circle plus two-line text, used in the footer
  trust strip (Free Shipping, Secure Payment, Premium Quality, Easy Returns).

**Extending the system:** product cards on a listing page, account nav
items, and form inputs should be built as new instances of these same four
patterns (or clearly-named siblings, e.g. `.product-card` sharing
`.cat-card`'s overlay approach) rather than new one-off styles, so the
system doesn't fragment as it grows.

---

## 5. Imagery

All photography is full-bleed and editorial — no product-on-white catalog
shots on the homepage. Each image carries a tuned CSS gradient scrim rather
than a flat dark overlay, so text stays legible while the photograph itself
stays the visual lead. `object-fit: cover` with per-section
`object-position` values keeps compositions intentional (e.g. the hero
biases toward the right where the model is framed).

**Extending the system:** a product detail page is the one place a
clean, non-overlaid product-on-neutral-background shot is appropriate —
that's where the customer needs to evaluate the item itself, not feel a
mood. Everywhere else (listing pages, collection banners), keep the
editorial full-bleed-plus-scrim treatment established on the homepage.

---

## 6. Micro-interactions

- Buttons and cards lift on hover (`translateY(-2px to -5px)`) with a
  matching shadow increase — never a color-only hover state.
- `.shop-now` links widen their icon gap on hover rather than just
  changing color, giving a small sense of motion toward the destination.
- Category card photos scale slightly (`scale(1.05)`) on card hover,
  behind the text overlay.
- Sections animate in on scroll via `IntersectionObserver` (`.rise`
  keyframe: fade + translate), respecting `prefers-reduced-motion`.
- Wishlist heart, search icon, and hamburger menu all have their own small
  feedback interaction on click, even though full functionality (actual
  search, actual wishlist state) isn't wired up yet.

---

## 7. Responsive behavior

Single shared breakpoint set (`880px`, `680px`, `420px`) rather than
per-component breakpoints:

- `880px` — the occasion split collapses to one column, image first.
- `680px` — promo row collapses to one column; hero grows taller to
  accommodate stacked text over the image.
- `420px` — trust strip and category grid tighten to `1fr 1fr` (they're
  already 2-column above this, so this only adjusts gap/sizing at the
  smallest widths).

The header's three-zone flex layout and the `.wrap` max-width container
handle desktop/tablet scaling without a separate desktop stylesheet.

---

## 8. What "complete system" means from here

The brief asks for a cohesive system across the *entire* experience. The
homepage delivers the visual language — palette, type, bento grids, card
patterns, button patterns, imagery treatment, motion — but the following
still need to be designed using that language, not a new one:

- **Product discovery** — category listing pages using the bento product-tile
  approach described in §2.
- **Product presentation** — detail page combining clean product photography
  (per §5) with the same typography and button system.
- **Shopping experience** — cart drawer/page and checkout, using `.pill-btn`
  for primary actions and the same card treatment for line items.
- **Customer account** — order history, addresses, wishlist page, built from
  the same trust-item / card / button vocabulary.
- **Supporting sections** — search results, empty states, 404 — same
  cream/gold foundation, same header, same component set.

Until those are built, `index.html` is the single source of truth for the
system's visual rules. Any new page should be checked against §1–§7 above
before introducing anything new.

### Use the provided product photos — not stock imagery

The homepage is built entirely from real Ruhvi product and campaign
photography, hosted on Cloudinary. When building any of the pages listed
above, use these same photos (and any additional real photos supplied later)
rather than sourcing stock images. The brand's editorial imagery is part of
the visual system documented in §5 — a stock photo, however well-matched in
color and mood, will not carry the same product accuracy and will read as
inconsistent next to the rest of the site.

**Currently used on the homepage:**

| Photo | Used for | URL |
|---|---|---|
| Timeless Elegance (model) | Hero banner | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781771/timeless_elegance_efj5j3.jpg` |
| Earrings (New Arrivals) | New Arrivals promo card | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781631/earings_h9z62v.jpg` |
| Best Sellers pendant | Best Sellers promo card | `https://res.cloudinary.com/tfelmupe/image/upload/v1787776431/oomy99pe62ani5lne1g8.jpg` |
| Ring | Rings category card | `https://res.cloudinary.com/tfelmupe/image/upload/vuz7w55c3jyu5u4hljk3.jpg` |
| Earrings (category) | Earrings category card | `https://res.cloudinary.com/tfelmupe/image/upload/v1787776515/xssdfjxsh1mdhp9vd3kw.jpg` |
| Chain necklace | Necklaces category card | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781470/product_chain_suh32k.jpg` |
| Bracelet | Bracelets category card | `https://res.cloudinary.com/tfelmupe/image/upload/v1787776558/m3ttnrpn5vgbawey5taj.jpg` |
| Explore Collections (model) | "For every you" split | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781770/explor_collections_etp3bp.jpg` |
| Exclusive Drops necklace | Limited Collection banner | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781769/exclusive_dropslimited_times_vsstgx.jpg` |
| Full model | "Your Story, Your Sparkle" CTA | `https://res.cloudinary.com/tfelmupe/image/upload/v1787781771/full_model_yfat2m.jpg` |

**Reserved, not yet placed** — stored in `index.html` as
`window.ruhviReservedProducts` for future use, not currently visible on the
homepage:

| Photo | URL |
|---|---|
| Product 1 | `https://res.cloudinary.com/tfelmupe/image/upload/v1787776404/taybbdybo7lo8tfrjplw.jpg` |
| Product 2 | `https://res.cloudinary.com/tfelmupe/image/upload/v1786983310/wbywdpcjnionacv1eiok.png` |

These two are natural candidates for the first product detail page or
product listing tiles built under §8 above, since they're real product shots
not yet used anywhere on the site.
