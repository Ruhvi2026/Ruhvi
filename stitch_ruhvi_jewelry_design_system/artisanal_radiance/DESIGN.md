---
name: Artisanal Radiance
colors:
  surface: '#fff9ee'
  surface-dim: '#dfd9d0'
  surface-bright: '#fff9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f3e9'
  surface-container: '#f3ede3'
  surface-container-high: '#ede7de'
  surface-container-highest: '#e8e2d8'
  on-surface: '#1d1b16'
  on-surface-variant: '#4f4538'
  inverse-surface: '#33302a'
  inverse-on-surface: '#f6f0e6'
  outline: '#817566'
  outline-variant: '#d2c4b3'
  surface-tint: '#7c580b'
  primary: '#7c580b'
  on-primary: '#ffffff'
  primary-container: '#c79a4b'
  on-primary-container: '#4c3300'
  inverse-primary: '#f0bf6c'
  secondary: '#685c51'
  on-secondary: '#ffffff'
  secondary-container: '#f1dfd1'
  on-secondary-container: '#6f6257'
  tertiary: '#7e5707'
  on-tertiary: '#ffffff'
  tertiary-container: '#c99948'
  on-tertiary-container: '#4d3300'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdeab'
  primary-fixed-dim: '#f0bf6c'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5f4100'
  secondary-fixed: '#f1dfd1'
  secondary-fixed-dim: '#d4c4b6'
  on-secondary-fixed: '#221a11'
  on-secondary-fixed-variant: '#50453a'
  tertiary-fixed: '#ffdead'
  tertiary-fixed-dim: '#f2be69'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#fff9ee'
  on-background: '#1d1b16'
  surface-variant: '#e8e2d8'
  cream-deep: '#EFE6D5'
  ink-soft: '#4A3F33'
  brown-dark: '#1C140D'
  brown-mid: '#2E2115'
  gold-pale: '#E9C989'
  line: rgba(42,33,24,0.12)
typography:
  display-hero:
    fontFamily: Marcellus
    fontSize: 54px
    fontWeight: '400'
    lineHeight: '1.06'
    letterSpacing: 0em
  display-hero-mobile:
    fontFamily: Marcellus
    fontSize: 34px
    fontWeight: '400'
    lineHeight: '1.1'
  brand-logo:
    fontFamily: Marcellus
    fontSize: 30px
    fontWeight: '400'
    letterSpacing: 0.28em
  section-heading:
    fontFamily: Marcellus
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.14'
  sub-heading-serif:
    fontFamily: Cormorant Garamond
    fontSize: 25px
    fontWeight: '500'
  body-lg:
    fontFamily: Jost
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.65'
  body-md:
    fontFamily: Jost
    fontSize: 14.5px
    fontWeight: '400'
    lineHeight: '1.7'
  eyebrow:
    fontFamily: Jost
    fontSize: 11px
    fontWeight: '500'
    letterSpacing: 0.18em
  cta-label:
    fontFamily: Jost
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.12em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  max-width: 1180px
  gutter: 18px
  margin-section: 22px
  padding-container: clamp(20px, 4vw, 40px)
  padding-pill: 15px 26px
  gap-nav: 16px
---

## Brand & Style
The design system embodies an **Editorial Luxury** aesthetic, merging the high-fashion sensibilities of print magazines with modern e-commerce functionality. The brand personality is refined, feminine, and artisanal, targeting a discerning audience that values craftsmanship over mass production.

The visual style is a sophisticated blend of **Minimalism** and **Bento Grid** architecture. It utilizes expansive whitespace, high-contrast sectioning (Cream vs. Deep Ink), and sophisticated "image-first" layouts. The emotional response should be one of "effortless elegance"—trustworthy, premium, and visually serene.

Key stylistic markers include:
- **Sophisticated Gradients:** Multi-stop linear and radial overlays to ensure text legibility over rich photography.
- **Micro-Interactions:** Meaningful "lifts" and "nudge" animations that feel tactile and responsive.
- **The Sparkle Motif (✦):** Used as a recurring brand signifier and functional bullet point.

## Colors
This design system employs a warm, restrained palette that avoids pure black or white to maintain a "premium" organic feel. 

- **Primary & Secondary:** The interaction between `@cream` (Background) and `@ink` (Text) provides the foundational contrast.
- **Accents:** `@gold` and `@gold-deep` are reserved for brand signifiers, primary CTAs, and active states.
- **Dark Modes:** High-impact sections (Hero, CTAs) transition to `@brown-dark` to create depth while maintaining warmth.
- **Functional:** `@line` is a precise hairline stroke used for subtle borders and dividers.

## Typography
The system uses a tri-font hierarchy to balance authority and approachability:

1.  **Marcellus (Display):** Reserved for high-impact headlines and the wordmark. Its wide tracking in the logo creates a boutique feel.
2.  **Cormorant Garamond (Accent Serif):** Used primarily in italics for subheadings and category titles to provide a feminine, editorial touch.
3.  **Jost (Functional Sans):** Handles all UI-heavy tasks, labels, and body copy to ensure clarity and modern balance.

Scale across devices using `clamp()` logic to ensure headlines remain impactful yet readable on mobile.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy with a maximum content width of 1180px. It utilizes a **Bento Grid** model where content blocks are arranged in modular, rectangular cells.

- **Rhythm:** A consistent 18px gap is used across all grid types to maintain a "clustered luxury" appearance.
- **Adaptive Behavior:** 
  - **Desktop:** Asymmetric splits and 4-column category grids.
  - **Tablet (880px):** Splits collapse to single columns; promo rows collapse.
  - **Mobile (420px):** Category grids maintain a 2-column "compact" layout to preserve visual density.

## Elevation & Depth
Depth is expressed through tonal layering and light-sourced shadows rather than standard grey drops.

- **Tonal Layers:** Using `@cream-deep` for hover states and icon containers creates a subtle "inset" or "raised" effect without changing the Z-index.
- **Atmospheric Shadows:** Shadows are tinted with `@gold` (e.g., `rgba(167,124,46,0.6)`) to reinforce the jewelry theme.
- **Glassmorphism:** The primary navigation uses a backdrop blur (10px) with 92% opacity `@cream` to allow product imagery to bleed through elegantly while maintaining text legibility.
- **Card Interaction:** Cards utilize a "Lift" effect (`translateY(-5px)`) coupled with a localized expansion of the gold-tinted shadow on hover.

## Shapes
The shape language is defined by generous, soft curves that contrast with the structured bento grid layout.

- **Variable Radii:** Scale based on element importance. Large banners use 22px, while standard product cards use 16px.
- **Pill Shapes:** Exclusively reserved for interactive buttons and labels.
- **Circular Elements:** Used for icon containers and badges to create rhythmic "anchor points" within the rectangular grid.
- **Borders:** All borders are kept to a 1px weight, acting as hairlines rather than structural separators.

## Components

### Buttons & Links
- **Primary (Pill):** Fully rounded, `@gold` gradient fill, with a subtle arrow icon. Includes a gold-tinted shadow that deepens on hover.
- **Secondary (Inline):** `@gold` text with a 1px solid underline. On hover, the associated icon "nudges" right.

### Cards
- **Editorial Cards:** Full-bleed imagery with a bottom-anchored gradient scrim. Text is overlaid in the lower third.
- **Category Tiles:** Feature a subtle scale-up effect (`1.05x`) on the background image during hover states.

### Inputs & UI Elements
- **Icon Containers:** Icons are housed in 40px circular containers with a 1.6-2 stroke weight.
- **Navigation:** A sticky header with a three-zone layout (Menu | Logo | Actions).
- **Cart Badge:** A circular `@gold-deep` indicator with `@cream` text.

### Feedback & Motion
- **Entrance:** Sections should use a `rise` animation (fade + 16px Y-translation) with a `cubic-bezier(.16, .84, .44, 1)` curve for a smooth, high-end feel.