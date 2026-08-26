# Ruhvi — UI Redesign Master Plan

## Purpose

This document is the complete UI/UX execution plan for the Ruhvi jewelry website redesign.

The core rule is simple:

> **Change the visual experience, not the product functionality.**

The redesign must preserve the existing application's functionality, business logic, routes, APIs, actions, integrations, data flows, and user journeys. The UI may be redesigned substantially, but existing features must remain accessible and functional.

This work is split into four phases so that each phase can be executed independently and safely.

---

# PHASE 1 — STITCH UI GENERATION

## Objective

Use Stitch only to generate the new premium Ruhvi UI design/template.

This phase is visual design generation only. Do not ask Stitch to redesign application logic, implement backend functionality, remove features, rewrite APIs, or make product/business decisions.

The output of Phase 1 becomes the primary visual reference/template for the remaining phases.

## Stitch Prompt

```text
Design a complete premium luxury jewelry e-commerce website UI for the Ruhvi brand.

Create the entire website interface as a polished, production-quality luxury jewelry experience.

Use a sophisticated cream/ivory visual foundation with refined champagne-gold accents, elegant typography, premium editorial imagery, generous whitespace, subtle borders, soft shadows, refined cards, and an upscale luxury aesthetic.

Use a modern Bento Grid-based layout system wherever appropriate, while keeping the overall experience elegant, balanced, editorial, and highly premium rather than overly decorative.

The design should feel like a high-end contemporary jewelry brand: minimal, luxurious, sophisticated, feminine, visually rich, and trustworthy.

Create a cohesive UI system across the complete experience, including the main storefront, navigation, product discovery, collections, product presentation, shopping experience, customer account areas, and supporting interface sections.

Prioritize:
- Premium luxury visual hierarchy
- Cream/ivory backgrounds
- Champagne-gold accents
- Elegant typography
- Editorial jewelry photography
- Sophisticated Bento Grid compositions
- Clean spacing and alignment
- High-end product presentation
- Clear navigation
- Refined micro-interactions and hover states
- Consistent cards, buttons, icons, forms, and UI components
- Responsive design suitable for desktop, tablet, and mobile
- A cohesive design system throughout the entire interface

Generate the UI as a complete, polished luxury jewelry e-commerce website design rather than a simple landing page.
```

## Phase 1 Rules

1. Stitch is being used only for UI/UX generation.
2. Do not intentionally remove or redefine functionality.
3. Do not use Stitch output as permission to change application logic.
4. The generated design should be treated as a visual template/reference for later implementation.
5. Preserve the Ruhvi brand feel: premium, warm, elegant, editorial, and modern.

## Phase 1 Deliverable

A complete Stitch-generated UI template covering the relevant Ruhvi customer experience and reusable visual components.

---

# PHASE 2 — ANTIGRAVITY: TEMPLATE-BASED UI IMPLEMENTATION

## Objective

Give the Stitch output/template to Antigravity and instruct it to use that design as the visual source of truth while implementing the redesign inside the existing Ruhvi project.

This is the first implementation phase.

The most important requirement is to preserve every existing feature and behavior.

## Antigravity Prompt — Phase 2

```text
You are working on the existing Ruhvi jewelry e-commerce application.

I am providing a UI template/design generated in Stitch. Use that template as the primary visual reference for the redesign.

Your task in this phase is to implement the new UI inside the existing application while preserving the existing application's functionality exactly.

IMPORTANT:

DO NOT treat the visual template as permission to remove, replace, disable, bypass, or simplify existing functionality.

The redesign must preserve:
- Existing routes
- Existing pages
- Existing buttons
- Existing actions
- Existing components that contain business logic
- Existing APIs
- Existing API integrations
- Existing authentication behavior
- Existing cart functionality
- Existing wishlist functionality
- Existing wallet functionality
- Existing profile functionality
- Existing order functionality
- Existing ticket/support functionality
- Existing tracking functionality
- Existing invoice functionality
- Existing coupon/offer functionality
- Existing product interactions
- Existing forms
- Existing states
- Existing validation
- Existing navigation flows
- Existing data loading and submission behavior
- Existing backend/frontend communication
- Existing analytics/event instrumentation
- Existing integrations

Use the Stitch template for visual direction only.

Do not create fake buttons or fake features to make the UI look complete.
All existing features must remain connected to their real functionality.

Do not remove a feature simply because it is not visually prominent in the template.
If an existing feature needs a new UI location, preserve the feature and place it naturally within the new design.

The final result must look like the Stitch design while remaining the same functional application underneath.

### Visual implementation requirements

Follow the Stitch template closely for:
- Layout
- Spacing
- Typography hierarchy
- Colors
- Cream/ivory background treatment
- Champagne-gold accents
- Card styling
- Borders
- Shadows
- Button styling
- Icon treatment
- Bento Grid composition
- Product presentation
- Navigation structure
- Visual hierarchy
- Responsive behavior
- Editorial/luxury feel

### Design philosophy

The result should feel like a premium contemporary jewelry brand rather than a generic e-commerce template.

Avoid:
- Generic SaaS styling
- Harsh pure-white layouts
- Excessive black UI
- Unnecessary gradients
- Cheap-looking cards
- Overly dense layouts
- Excessive rounded components that weaken the luxury feel
- Inconsistent typography
- Random spacing
- Visually noisy sections

### Implementation safety

Before changing a component, understand what functionality it currently provides.

Do not overwrite business logic merely to simplify the UI.

Separate presentation changes from behavior whenever practical.

Before considering this phase complete, verify that all pre-existing functionality is still reachable and operational.

Do not begin unrelated refactoring.
Do not change backend behavior unless it is strictly necessary for a UI integration bug and the existing behavior can be preserved.

Phase 2 is primarily about integrating the new design into the existing application safely.
```

## Phase 2 Completion Criteria

- Stitch visual language is present in the existing application.
- Existing features remain available.
- Existing routes still work.
- Existing API behavior remains intact.
- No placeholder behavior replaces working functionality.
- No existing feature has been silently removed.
- Visual hierarchy matches the template as closely as practical.

---

# PHASE 3 — ANTIGRAVITY: DESKTOP UI REFINEMENT

## Objective

Refine the implemented design specifically for desktop and large-screen experiences.

Phase 3 assumes Phase 2 has already been completed.

Do not restart the redesign from scratch. Refine the existing implementation.

## Antigravity Prompt — Phase 3

```text
Continue from the current Ruhvi application after Phase 2.

Do not redesign the product from scratch.
Do not replace the existing implementation with a different concept.

Your task in this phase is to refine and complete the desktop UI based on the Stitch template that was established in Phase 2.

Treat the existing Phase 2 implementation as the base.

### Desktop priorities

Optimize the UI for:
- Large desktop screens
- Laptop screens
- Wide content areas
- Navigation clarity
- Product discovery
- Product imagery
- Bento Grid composition
- Luxury editorial storytelling
- Consistent section spacing
- Strong visual hierarchy
- Premium typography
- Refined interactions

### Visual quality requirements

Check and refine:
- Grid alignment
- Container widths
- Section rhythm
- Typography scale
- Heading hierarchy
- Button proportions
- Icon sizing
- Product card proportions
- Image aspect ratios
- Whitespace
- Gold accent usage
- Border treatment
- Shadow subtlety
- Hover states
- Focus states
- Navigation behavior
- Header/footer consistency

The interface should feel intentional and expensive, not merely functional.

### Functional safety rule

Do not change or remove functionality while refining the visual presentation.

All existing interactions must continue using the actual application behavior.

Do not replace a working flow with a visual mockup.
Do not remove buttons because they are not visible in the reference template.
Do not remove or disable:
- Wishlist
- Wallet
- Cart
- Profile
- Orders
- Tickets
- Track Order
- Invoice Download
- Product actions
- Search/filter/sort behavior
- Authentication flows
- Existing customer/account features

Preserve all existing routes and APIs.

### Validation

After refinement, inspect the primary desktop customer journeys from start to finish.

Verify that visual improvements have not caused:
- Broken navigation
- Missing actions
- Dead buttons
- Broken forms
- Broken API calls
- Missing state handling
- Incorrect responsive classes/styles
- Broken product interactions
- Lost account functionality

Only finish the phase when the desktop experience is visually refined and functionally intact.
```

## Phase 3 Completion Criteria

- Desktop UI closely matches the Stitch direction.
- Layout feels premium and consistent across pages.
- No regression caused by visual refinement.
- Functional behavior remains unchanged.
- Major customer journeys work end-to-end.

---

# PHASE 4 — ANTIGRAVITY: MOBILE + RESPONSIVE + REGRESSION TESTING

## Objective

Optimize the complete experience for mobile and tablet while protecting the existing functionality.

This phase also includes the final regression pass.

Do not use mobile optimization as a reason to remove features.

## Antigravity Prompt — Phase 4

```text
Continue from the completed Phase 3 Ruhvi application.

This phase is for responsive optimization, mobile UI refinement, accessibility-oriented interaction improvements, and final regression testing.

Do not redesign the application from scratch.
Do not replace the established Stitch-based visual direction.
Do not remove functionality to simplify mobile layouts.

### Responsive targets

Optimize for:
- Mobile phones
- Small mobile phones
- Large mobile phones
- Tablets
- Desktop/tablet transition widths

### Mobile UI priorities

Ensure:
- Navigation remains clear
- Header remains usable
- Menu interactions are intuitive
- Product cards remain premium and readable
- Product images remain visually strong
- Bento Grid sections adapt cleanly
- Typography scales properly
- Buttons remain easy to tap
- Forms remain usable
- Modals/drawers fit the viewport
- Sticky/floating elements do not block content
- No horizontal scrolling occurs unintentionally
- Spacing remains balanced
- Important actions remain accessible

### Preserve every existing feature

Mobile optimization must not remove, hide permanently, disable, or bypass existing functionality.

Specifically verify:
- Wishlist
- Wallet
- Cart
- Profile
- Orders
- Track Order
- Invoice Download
- Tickets/Support
- Search
- Filters
- Product actions
- Authentication
- Account actions
- Existing checkout flow
- Existing navigation
- Existing API-driven states

If a feature cannot fit directly into the desktop-style layout, create an appropriate mobile presentation for the same feature rather than removing it.

### Final regression test

Perform a functional regression pass across the application.

Check:
1. Home/storefront navigation
2. Collection/category navigation
3. Product listing
4. Product detail
5. Product image interactions
6. Wishlist
7. Cart
8. Wallet
9. Profile/account
10. Orders
11. Order details
12. Track Order
13. Invoice Download
14. Tickets/support
15. Search
16. Filters/sorting
17. Authentication/login/signup/OTP where applicable
18. Forms and validation
19. API-driven data loading
20. Loading states
21. Empty states
22. Error states
23. Responsive behavior
24. Navigation between all major routes

### Regression rules

If a regression is discovered, fix the regression without reverting the overall visual redesign.

Do not solve a regression by removing a feature.
Do not replace functionality with mock data.
Do not silently disable broken controls.
Do not hide a broken feature simply because it is difficult to fit into the design.

### Final quality gate

Before declaring the project complete, confirm:
- The Stitch design language is consistently represented.
- Desktop remains stable.
- Mobile remains stable.
- Tablet layouts remain stable.
- Existing features remain accessible.
- Existing actions still trigger their real behavior.
- Existing API integrations remain connected.
- Major customer journeys work end-to-end.
- No important feature has been lost during the UI redesign.
```

## Phase 4 Completion Criteria

- Mobile UI is polished and responsive.
- Tablet layouts are stable.
- Desktop has not regressed.
- Existing functionality is preserved.
- Major customer flows pass regression testing.
- No existing feature has been hidden or removed as a shortcut.

---

# GLOBAL RULES FOR ALL PHASES

These rules apply throughout the entire redesign.

## 1. UI redesign does not mean feature redesign

The purpose is to improve the visual experience while keeping the existing product behavior intact.

## 2. Stitch is the visual source of truth

Use Stitch as the reference for visual direction, not as authorization to change application functionality.

## 3. Antigravity must work with the existing codebase

Prefer modifying presentation layers and existing components over replacing the application architecture.

## 4. Never remove functionality for visual simplicity

A feature that is not obvious in the reference design still needs to exist in the final application.

## 5. Preserve real interactions

Buttons, links, forms, menus, drawers, modals, cards, and controls must connect to the application's real behavior.

## 6. Preserve APIs and integrations

Do not replace real API/data behavior with static mock content unless the existing implementation itself already uses mock data.

## 7. Preserve navigation

Do not break or silently change routes merely to match the template.

## 8. Avoid unnecessary refactoring

Do not perform unrelated architecture or dependency changes during UI implementation.

## 9. Accessibility and usability

Keep keyboard focus, readable contrast, semantic controls, clear tap targets, and usable forms where applicable.

## 10. Premium brand consistency

The Ruhvi experience should consistently communicate:

- Luxury
- Warmth
- Elegance
- Modernity
- Editorial sophistication
- Premium jewelry presentation

Primary visual direction:

**Cream / Ivory + Champagne Gold + Elegant Typography + Editorial Imagery + Bento Grid**

---

# EXECUTION ORDER

Use the following order strictly:

**Phase 1 → Stitch UI Generation**

Generate and review the visual template.

**Phase 2 → Antigravity UI Integration**

Provide the Phase 1 template and implement it inside the existing application without breaking functionality.

**Phase 3 → Antigravity Desktop Refinement**

Refine desktop presentation and visual consistency without changing functionality.

**Phase 4 → Antigravity Mobile + Regression**

Optimize responsive behavior and perform the final functional regression test.

Do not combine all phases into one large Antigravity instruction. Run each phase independently so that the scope remains controlled and each stage can be validated before continuing.

---

# FINAL SUCCESS CONDITION

The redesign is successful only when both conditions are true:

1. The Ruhvi website visually feels like the intended premium luxury jewelry brand represented by the Stitch template.
2. The existing application's functionality remains intact and accessible after the redesign.

**Visual transformation: YES.**

**Functional regression: NO.**
