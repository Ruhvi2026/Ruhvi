# Ruhvi — 360° Product Photo Viewer
## Antigravity Implementation Specification

**Document purpose:** Add an optional, production-ready 360° product photo viewer to the existing Ruhvi ecommerce website without breaking, replacing, or restructuring the existing application.

**Primary stack assumed:** React + TypeScript, Supabase, Cloudinary.

**Core requirement:** Customers must be able to open a product's 360° view, drag/swipe to rotate the item through its photographed angles, and zoom in/out. Products that do not have 360° assets must continue working exactly as they do today.

---

## 1. NON-NEGOTIABLE RULES

Antigravity must follow these rules before changing any code:

1. **Do not redesign the existing application.**
2. **Do not replace the current image gallery.**
3. **Do not replace the current Cloudinary setup.** Reuse the existing Cloudinary configuration, upload flow, URL helpers, transformations, and environment variables whenever available.
4. **Do not replace Supabase.** Reuse the existing Supabase client, database conventions, types, migrations, RLS policies, and data-access patterns.
5. **Do not modify checkout, cart, wishlist, authentication, payments, search, filters, reviews, or other unrelated features.**
6. **Do not introduce a new state-management library** just for this feature.
7. **Do not introduce a new UI framework** just for this feature.
8. **Do not introduce a paid SaaS dependency** for the viewer.
9. **Do not make 360° images mandatory.** This is an optional enhancement on selected products.
10. **Do not load 360° assets on initial product-page load.** The 360 viewer and its frame sequence must be lazy-loaded only when the customer requests it.
11. **Preserve current URLs and public routes.**
12. **Preserve current visual design.** New controls must inherit the existing design system, typography, spacing, colors, buttons, modal patterns, and responsive behavior.
13. **Prefer the smallest possible code change.** Reuse existing components and utilities before creating new ones.
14. **Before editing files, inspect the existing repository and identify the current product model, product page, image gallery, admin/product-management page, Cloudinary integration, Supabase schema, and route structure.**
15. If any assumption in this document conflicts with the existing codebase, **adapt to the existing architecture rather than forcing this document's example structure**.

---

## 2. FEATURE SCOPE

### Customer-facing functionality

For products that have a configured 360° image sequence:

- Show a subtle **"360° View"** action near the existing product image gallery.
- Do not show the action for products without a 360° sequence.
- When opened, display the product in a dedicated viewer/modal that matches the existing site style.
- Customer can:
  - drag left/right on desktop to rotate;
  - swipe left/right on mobile to rotate;
  - use mouse/touch/pointer interaction without accidental page navigation;
  - pinch-to-zoom on supported touch devices;
  - use mouse-wheel zoom on desktop where appropriate;
  - use visible zoom controls as a fallback;
  - reset zoom to 1x;
  - close the viewer easily;
  - optionally use fullscreen when supported by the browser and the existing UX.
- The viewer must remain usable on small mobile screens.
- The viewer must not alter product purchase logic.

### Admin-facing functionality

For products with 360° assets:

- Add an optional **360° Frames** section to the existing product create/edit flow.
- Admin can enter/upload/configure a sequence of frame images.
- Admin can reorder frames if the existing upload UI supports ordering.
- Admin can replace or remove a 360° sequence.
- Admin can save a product without a 360° sequence.
- Existing product image upload behavior must remain unchanged.

### Storage/media requirements

Use Cloudinary for the actual image files. Supabase should store only metadata/references needed by the application, not image binaries.

---

## 3. FIRST TASK: REPOSITORY AUDIT

Before implementation, Antigravity must inspect the codebase.

Find and document internally:

- React entry points.
- Product-detail route/component.
- Existing product/gallery component.
- Existing modal/drawer/fullscreen components, if any.
- Existing image component and lazy-loading strategy.
- Existing TypeScript product types/interfaces.
- Existing Supabase client.
- Existing product table/schema and generated DB types, if present.
- Existing product create/edit/admin component.
- Existing Cloudinary upload utility.
- Existing Cloudinary URL transformation utility.
- Existing image ordering model.
- Existing authentication/role checks for admin pages.
- Existing CSS/Tailwind/styling conventions.
- Existing testing setup.
- Existing lint/format/build commands.

Do not create duplicate helpers if equivalent utilities already exist.

At the beginning of the implementation, produce a concise internal mapping:

```text
Product page: <path>
Product type: <path>
Gallery component: <path>
Admin product editor: <path>
Cloudinary helper: <path>
Supabase client: <path>
Product DB schema/type: <path>
Styling system: <description>
Tests: <paths/tooling>
```

Do not ask the user to provide these paths unless the repository truly contains no discoverable structure.

---

## 4. DATA MODEL DESIGN

### Preferred design

Use an optional 360° asset reference on the product, without disturbing existing image fields.

Prefer one of these approaches based on the existing schema:

### Option A — Existing JSON/metadata field exists

If the product already has an extensible metadata/options JSON field, store a structure similar to:

```json
{
  "viewer360": {
    "enabled": true,
    "frames": [
      "https://res.cloudinary.com/.../frame-001.jpg",
      "https://res.cloudinary.com/.../frame-002.jpg",
      "https://res.cloudinary.com/.../frame-003.jpg"
    ],
    "frameCount": 36,
    "startIndex": 0,
    "stepDegrees": 10
  }
}
```

### Option B — Dedicated columns/table

If the current project does not have a safe metadata field, introduce the smallest isolated schema addition.

Preferred normalized table:

```sql
create table if not exists public.product_360_sets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  enabled boolean not null default true,
  frame_count integer not null,
  step_degrees numeric null,
  frames jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id)
);
```

The exact table/column names must be adapted to the repository's existing naming convention.

`frames` should contain ordered frame metadata rather than only raw strings when the current architecture can support it:

```json
[
  {
    "index": 0,
    "publicId": "products/necklace-001/360/frame-000",
    "url": "https://res.cloudinary.com/...",
    "alt": "Ruhvi necklace 360 degree view frame 1"
  }
]
```

### Important data constraints

- `frame_count` must equal the number of frames in `frames`.
- Minimum supported frames: 8.
- Recommended frames: 36.
- Good higher-quality option: 72.
- Maximum recommended frames for this implementation: 72 unless there is a demonstrated product requirement.
- Frame indexes must be contiguous and ordered.
- Empty/missing frame URLs must be rejected during save.
- A product can exist without any 360° data.
- Deleting a 360° set must not delete the normal product gallery.

### RLS/security

If a new Supabase table is created:

- Follow the project's current RLS conventions.
- Customers should only receive 360° metadata needed for published products.
- Admin operations must require the same role/authorization mechanism already used by the existing product-management screens.
- Do not expose service-role keys to the browser.
- Do not weaken existing RLS policies.

---

## 5. CLOUDINARY ORGANIZATION

Do not create a second media platform.

Use the existing Cloudinary integration.

Recommended folder convention:

```text
products/
  <product-slug-or-product-id>/
    gallery/
      main.jpg
      detail-01.jpg
      detail-02.jpg
    360/
      frame-000.jpg
      frame-001.jpg
      frame-002.jpg
      ...
      frame-035.jpg
```

For 36 frames, use deterministic names:

```text
frame-000
frame-001
...
frame-035
```

For 72 frames:

```text
frame-000
...
frame-071
```

Use the existing Cloudinary naming convention if one already exists.

### Image delivery

Use Cloudinary transformations to request a web-appropriate version.

Preferred behavior:

- responsive width based on device/container;
- automatic format (`f_auto`) where supported by the project's current URL strategy;
- automatic quality (`q_auto`) where supported;
- preserve visual fidelity for jewellery;
- never upscale unnecessarily;
- use a consistent output aspect ratio for every frame of a product.

Do not hardcode transformations if the existing project already has a centralized Cloudinary transformer.

---

## 6. IMAGE CAPTURE SPECIFICATION

The software depends on consistent frames. Document this in the admin/help text where appropriate.

### Recommended capture setup

The user will create the frames using a smartphone.

Recommended capture workflow:

- fixed smartphone position;
- fixed focus;
- fixed exposure;
- fixed white balance where the camera app permits;
- fixed zoom level;
- product centered on the turntable;
- product and camera must remain at the same height throughout the sequence;
- stable lighting;
- no changing shadows between frames;
- plain/repeatable background;
- turntable rotation without moving the camera.

### Recommended frame counts

- 36 frames = default/recommended.
- 72 frames = smoother rotation but heavier network/storage cost.
- 24 frames = acceptable fallback.

Do not require 3D modeling. This feature is a photographic 360° spin viewer, not a mesh-based 3D viewer.

---

## 7. VIEWER IMPLEMENTATION

### Recommended architecture

Create a reusable isolated component, for example:

```text
Product360Viewer
Product360Modal
Product360Button
useProduct360Frames (only if actually needed)
```

Adapt names to the project's conventions.

The viewer should receive a minimal data contract:

```ts
export interface Product360Frame {
  index: number;
  url: string;
  publicId?: string;
  alt?: string;
}

export interface Product360Config {
  enabled: boolean;
  frames: Product360Frame[];
  stepDegrees?: number;
}
```

If the project already has a product media type, extend it rather than creating a duplicate product model.

### Rendering strategy

Preferred default:

- render one frame at a time in the viewer;
- preload a small number of adjacent frames;
- progressively load the full frame sequence after the viewer is opened;
- do not download all 36/72 frames during initial product-page rendering.

This is specifically required to protect page-load performance.

### Frame selection

For N frames:

```text
frameIndex = normalizedRotationIndex
```

Rotation must wrap around:

```text
0 -> 1 -> 2 -> ... -> N-1 -> 0
```

Dragging right should rotate consistently in one direction; dragging left should rotate in the opposite direction.

The exact direction may be inverted if it matches the existing design preference, but it must remain consistent.

### Drag sensitivity

Use pointer movement rather than browser-specific mouse/touch APIs.

Conceptually:

```text
horizontalDelta = currentX - startX
frameDelta = round(horizontalDelta / dragSensitivity)
```

The implementation must be tuned for comfortable mobile swiping and desktop dragging.

Do not require a huge swipe to move only one frame.

### Pointer interaction

Use Pointer Events where supported.

Required states:

- idle
- pointer down
- dragging
- releasing
- zooming
- loading
- error

When dragging the viewer:

- prevent accidental image selection;
- prevent unwanted browser drag behavior;
- do not scroll the page horizontally;
- preserve vertical page scrolling where possible on mobile.

### Touch behavior

Required:

- one-finger horizontal drag = rotate;
- two-finger pinch = zoom;
- two-finger pan while zoomed = move around the image;
- avoid hijacking normal page scroll when the gesture is primarily vertical and the viewer is not zoomed.

Do not add a large third-party gesture framework unless the repository already uses one or the native implementation becomes demonstrably unreliable.

---

## 8. ZOOM IMPLEMENTATION

Zoom is mandatory.

### Minimum zoom features

- zoom in;
- zoom out;
- reset zoom;
- pinch-to-zoom on touch devices;
- mouse-wheel zoom on desktop;
- zoom must preserve the current frame;
- zoomed image must not spill outside the viewer container;
- user must be able to pan a zoomed image.

### Zoom range

Use sensible limits such as:

```text
minScale = 1
maxScale = 3 or 4
```

Start at `1x`.

Do not allow infinite zoom.

### Zoom behavior

When the user zooms, the image should zoom toward the gesture's focal point where technically practical.

On reset:

```text
scale = 1
translateX = 0
translateY = 0
```

Do not change the selected frame when resetting zoom.

---

## 9. LOADING / PERFORMANCE

This is one of the most important requirements.

### Product page

On initial product-page load:

- do not download all 360 frames;
- do not initialize the viewer until the user requests it;
- the 360 button may render immediately because it is tiny metadata/UI.

### Viewer opening

On open:

1. load the current/first frame;
2. display a lightweight loading state;
3. preload adjacent frames;
4. continue preloading the remaining sequence in the background;
5. never block UI interaction unnecessarily.

### Suggested preload order for 36 frames

```text
current
current - 1
current + 1
current - 2
current + 2
...
```

Wrap indices around the array.

### Caching

Use normal browser caching and Cloudinary CDN caching.

Avoid unnecessary duplicate requests for a frame already loaded.

An in-memory cache is acceptable for the active viewer.

Do not implement an oversized global cache that persists indefinitely across the application.

### Image size

Do not request full-original Cloudinary images for the viewer.

Use a responsive delivery width appropriate for the viewer container, for example:

```text
mobile: ~800px
large desktop: ~1200–1600px
```

The exact transformation must follow existing project standards and device/container sizing.

### Performance targets

Feature must not materially worsen the initial product-page load.

Acceptance target:

- 360° assets are absent from the initial network waterfall unless the viewer is opened.
- first frame appears quickly after viewer open on a normal mobile connection.
- rotation remains responsive after adjacent frames have loaded.
- no noticeable frame flashing caused by inconsistent dimensions.

---

## 10. RESPONSIVE UX

### Mobile

- large enough touch target for the 360° button;
- viewer respects device safe areas;
- pinch zoom works;
- swipe rotation works;
- close control remains accessible;
- body scrolling is handled correctly when modal is open;
- no horizontal page overflow.

### Desktop

- drag to rotate;
- wheel zoom;
- visible zoom controls;
- close control;
- optional fullscreen if the existing app supports it cleanly.

### Tablet

Behave between the mobile and desktop interaction models.

---

## 11. ACCESSIBILITY

The feature must be accessible.

Requirements:

- 360° trigger must be keyboard accessible.
- Modal must have an accessible name.
- Close button must have an accessible label.
- Zoom buttons must have accessible labels.
- Viewer must expose useful alt text.
- Escape closes the modal on desktop keyboard input.
- Focus should move into the modal when opened and return to the trigger when closed, following the existing modal conventions.
- Do not rely on color alone to communicate state.
- Do not make drag/swipe the only available interaction for core controls.

Suggested labels:

```text
"View product in 360 degrees"
"Zoom in"
"Zoom out"
"Reset zoom"
"Close 360 degree viewer"
```

---

## 12. PRODUCT PAGE UX

Do not redesign the page.

Add the 360° control close to the current media/gallery controls.

Example behavior:

```text
[Existing product gallery]

[ View in 360° ]   <- only if 360 assets exist
```

When 360 data is absent:

- do not show a disabled button;
- simply omit the button.

The normal gallery remains the default initial experience.

The user must be able to return from 360° to the normal product page without losing selected product options, variant, quantity, or scroll state.

---

## 13. ADMIN UX

Extend the existing product create/edit screen rather than building a separate admin application.

Recommended section:

```text
360° Product View

[Enable 360° view]

Frames
[ Upload 360° Frames ]

36 frames uploaded
[Preview]
[Reorder if supported]
[Remove]

Recommended: 36 frames
Accepted: 24–72 frames
```

### Validation

Block save when:

- 360° is enabled but there are no frames;
- there are missing frame URLs;
- frame indices are duplicated;
- frame order is invalid;
- the number of frames is outside the supported range.

Allow save when:

- 360° is disabled;
- 360° is enabled with a valid sequence.

### Upload behavior

- Use the existing authenticated admin flow.
- Upload to the appropriate Cloudinary folder.
- Preserve deterministic order.
- Show upload progress if the current app has progress UI patterns.
- Handle partial upload failures safely.
- Never save a broken database record pointing to missing frame files.

### Replacement/removal

If admin replaces a frame set:

1. validate the new set;
2. upload the new set;
3. update metadata/reference;
4. only then remove obsolete Cloudinary assets if the existing integration safely supports deletion.

Do not delete current working assets before the new set is valid.

---

## 14. ERROR HANDLING

### No 360 data

Do not show an error. Simply hide the 360 action.

### Viewer data exists but one frame fails

- show a non-blocking error state;
- continue with available frames where possible;
- do not crash the product page;
- log useful diagnostic information in development.

### All frames fail

Show a friendly message:

```text
360° view is temporarily unavailable.
```

Allow the customer to close the viewer and continue browsing the product.

### Cloudinary/network failure

Never expose secrets or internal stack traces to the customer.

---

## 15. SECURITY REQUIREMENTS

- Never expose Cloudinary private credentials or API secrets in client code.
- Never expose the Supabase service-role key in client code.
- Existing environment-variable conventions must be preserved.
- Reuse the existing authenticated server-side/admin upload path where applicable.
- Validate admin access using the project's existing authorization mechanism.
- Sanitize/validate frame metadata before persistence.
- Do not accept arbitrary remote image URLs from untrusted users unless the existing architecture explicitly supports this safely.

---

## 16. DATABASE / API COMPATIBILITY

Any new API/data-access layer must be additive.

Do not break existing product queries.

Preferred behavior:

- existing product query continues to work;
- 360 data is fetched separately or included via an optional relation only where appropriate;
- products with no 360° data remain valid;
- existing cached product data remains valid;
- no migration should require rewriting all existing products.

If a new relation is used, prefer a lightweight optional query or join rather than forcing the full 360-frame list into every product card/query.

**Important:** Product listing pages, search results, category grids, recommendations, and cart data must not fetch the full 360 frame sequence.

---

## 17. TYPESCRIPT REQUIREMENTS

Use strict typing consistent with the repository.

Do not introduce `any` unless there is an unavoidable boundary and it is narrowly isolated.

Use explicit types for:

- 360 configuration;
- frame metadata;
- loading state;
- viewer state;
- pointer/gesture state;
- zoom state;
- admin upload state.

Keep component props minimal.

---

## 18. COMPONENT RESPONSIBILITIES

Use a clean separation of responsibilities.

### `Product360Button`

Responsible only for:

- rendering the action;
- accessibility;
- opening the viewer.

### `Product360Modal`

Responsible for:

- modal lifecycle;
- focus/keyboard handling;
- body-scroll locking consistent with existing modals;
- close behavior;
- hosting the viewer.

### `Product360Viewer`

Responsible for:

- frame rendering;
- rotation interaction;
- zoom/pan;
- preload/cache;
- loading/error states.

### Data layer

Responsible for:

- retrieving optional 360 metadata;
- saving admin changes;
- validating data;
- mapping DB data to UI types.

Do not put Supabase calls directly inside low-level rendering components if the project's architecture already separates data access from UI.

---

## 19. ANIMATION / VISUAL QUALITY

Keep transitions subtle.

Do not add a heavy 3D animation effect that makes jewellery look artificial.

The product should visually feel like the actual photographed item.

Frame dimensions must be consistent so there is no jumping/resizing while rotating.

A plain high-quality image sequence is the source of truth.

---

## 20. TESTING REQUIREMENTS

Add tests according to the existing project testing framework.

### Unit tests

At minimum test:

- frame index wrapping;
- left/right rotation;
- frame validation;
- invalid frame metadata;
- zoom boundaries;
- zoom reset;
- missing 360 data;
- successful 360 data mapping.

### Component tests

Test:

- 360 button is hidden when disabled/no frames;
- 360 button is visible when valid frames exist;
- opening viewer;
- closing viewer;
- Escape closes viewer;
- zoom controls work;
- reset works;
- drag changes frame;
- product page remains functional.

### Integration tests

Test:

- admin creates/saves valid 360 data;
- invalid 360 data is rejected;
- existing product images still work;
- product without 360 data still renders normally;
- 360 assets are not requested until the viewer is opened.

### Manual mobile QA

Verify on a modern mobile browser:

- one-finger horizontal swipe rotates;
- two-finger pinch zooms;
- zoomed pan works;
- vertical page scrolling is not unnecessarily blocked;
- close button works reliably;
- viewer fits the viewport.

### Manual desktop QA

Verify:

- mouse drag rotates;
- mouse wheel zoom works;
- keyboard close works;
- page does not horizontally overflow;
- viewer remains responsive.

---

## 21. ANALYTICS / OBSERVABILITY

Do not add a new analytics provider.

If the existing site already tracks product interactions, optionally add events using the existing analytics abstraction:

```text
product_360_open
product_360_rotate
product_360_zoom
product_360_error
```

Do not make analytics a hard dependency for the feature.

If analytics are absent, skip this section rather than installing a new provider.

---

## 22. SEO REQUIREMENTS

The 360 viewer itself does not need to become a separate route.

Do not create indexable duplicate product pages.

Keep the existing product page URL/canonical behavior unchanged.

The normal product image/gallery remains the SEO fallback.

---

## 23. PERFORMANCE SAFETY CHECK

Before finalizing, inspect the Network tab or equivalent local tooling.

Confirm:

### Initial product page

```text
360 frame requests: 0
```

unless the user explicitly opened the 360 viewer.

### After opening

The current/first frame loads first, then adjacent frames, then the remaining frames.

### Product listing pages

```text
360 frame requests: 0
```

They must never download full 360 sequences.

---

## 24. FAILURE-SAFE IMPLEMENTATION

If any new 360 component crashes, the rest of the product page must continue working.

Use defensive checks around optional data.

Conceptual fallback:

```tsx
{product.viewer360?.enabled && product.viewer360.frames?.length ? (
  <Product360Button ... />
) : null}
```

Do not allow malformed 360 metadata to break product rendering.

---

## 25. ACCEPTANCE CRITERIA / DEFINITION OF DONE

The feature is complete only when all of the following are true:

### Existing application safety

- [ ] Existing product gallery works exactly as before.
- [ ] Existing product page works exactly as before when 360 is absent.
- [ ] Existing cart works.
- [ ] Existing wishlist works.
- [ ] Existing variant selection works.
- [ ] Existing checkout flow is untouched.
- [ ] Existing authentication is untouched.
- [ ] Existing search/category pages are untouched.
- [ ] Existing URLs/routes are preserved.

### 360 feature

- [ ] Products can optionally have a 360° frame sequence.
- [ ] 360 button appears only for configured products.
- [ ] Viewer opens without navigating away from the product page.
- [ ] Customer can rotate with desktop drag.
- [ ] Customer can rotate with mobile swipe.
- [ ] Rotation wraps continuously from the last frame to the first.
- [ ] Customer can zoom in.
- [ ] Customer can zoom out.
- [ ] Customer can reset zoom.
- [ ] Pinch-to-zoom works on supported touch devices.
- [ ] Zoomed content can be panned.
- [ ] Viewer can be closed.
- [ ] Escape closes the viewer where keyboard input is available.
- [ ] Focus handling follows accessibility requirements.

### Performance

- [ ] 360 frames are not loaded on initial product-page render.
- [ ] 360 frames are not loaded on product listing pages.
- [ ] Viewer loads lazily.
- [ ] Adjacent frames are preloaded first.
- [ ] Cloudinary transformations are used appropriately.
- [ ] No unnecessary original-resolution images are requested.
- [ ] No large unnecessary JS dependency is added.

### Admin

- [ ] Admin can add 360 frames.
- [ ] Admin can edit/replace frames.
- [ ] Admin can remove/disable 360 view.
- [ ] Invalid frame sets are rejected.
- [ ] Existing product image upload remains unchanged.
- [ ] Admin permissions use the existing authorization system.

### Data/security

- [ ] No private Cloudinary credentials are exposed.
- [ ] No Supabase service-role key is exposed.
- [ ] Existing RLS/security is preserved.
- [ ] 360 metadata is optional.
- [ ] Existing products require no manual migration/data rewrite unless strictly necessary.

### Quality

- [ ] TypeScript passes.
- [ ] Lint passes.
- [ ] Existing tests pass.
- [ ] New tests pass.
- [ ] Production build passes.
- [ ] No console errors in the normal flow.
- [ ] Mobile and desktop manual QA completed.

---

## 26. IMPLEMENTATION ORDER FOR ANTIGRAVITY

Follow this order. Do not start by editing random files.

### Phase 1 — Inspect

1. Read the repository structure.
2. Identify existing product/gallery/admin/Cloudinary/Supabase implementations.
3. Identify existing modal and image components.
4. Identify test/build commands.
5. Reuse existing patterns.

### Phase 2 — Data contract

6. Decide whether the existing schema can safely hold optional 360 metadata.
7. Prefer the smallest additive data change.
8. Add migration/types only if needed.
9. Preserve backward compatibility.

### Phase 3 — Viewer core

10. Build the isolated frame-sequence viewer.
11. Add frame rotation logic.
12. Add preload/cache logic.
13. Add zoom/pan logic.
14. Add loading/error states.

### Phase 4 — Product-page integration

15. Add optional 360 trigger beside the existing gallery.
16. Lazy-load the viewer only on interaction.
17. Ensure the normal product page is unchanged.

### Phase 5 — Admin integration

18. Add optional 360 frame management to the existing product editor.
19. Validate the sequence.
20. Upload/store metadata using existing Cloudinary/Supabase patterns.

### Phase 6 — QA

21. Add unit/component/integration tests.
22. Run lint.
23. Run typecheck.
24. Run production build.
25. Verify network behavior.
26. Test mobile gestures.
27. Test desktop interaction.
28. Fix regressions before finalizing.

---

## 27. ANTIGRAVITY BEHAVIORAL INSTRUCTIONS

When implementing this document:

- Inspect first, modify second.
- Never assume a file path.
- Never replace an existing component just because a new component seems cleaner.
- Reuse existing utilities.
- Keep the pull/request-like change small and isolated.
- Prefer additive changes.
- Keep the existing design language.
- Keep existing interfaces backward compatible.
- Do not rewrite unrelated code while touching a file.
- Do not perform broad formatting changes across the repository.
- Do not upgrade dependencies unless required for this feature.
- If a dependency is truly required, prefer a small, mature, lightweight dependency and explain why in the final implementation report.
- Do not add a dependency for something that can be implemented reliably with existing browser APIs and the project's current stack.
- Do not introduce a paid service.
- Do not create a new backend service.
- Do not create a new authentication system.
- Do not create a separate admin application.

### Preserve user experience

The existing Ruhvi website is the source of truth for visual design and behavior. The new feature should feel native to it, not bolted on.

### Preserve future extensibility

The implementation should make it possible to add these later without rewriting the viewer:

- 24/36/72 frame sets;
- alternative frame resolutions;
- optional fullscreen;
- optional loading progress;
- optional analytics using the existing analytics system;
- future AR/3D features as a separate feature.

Do not implement AR or real 3D in this task.

---

## 28. FINAL IMPLEMENTATION REPORT REQUIRED FROM ANTIGRAVITY

At the end, report:

1. Files created.
2. Files modified.
3. Database migration(s) created, if any.
4. Cloudinary changes made, if any.
5. New components/utilities created.
6. Tests added.
7. Commands run and their results.
8. Any dependency added and why.
9. Performance/network verification result.
10. Any remaining limitations.

Keep the final implementation report factual. Do not claim a test passed unless it was actually run.

---

## 29. OUT-OF-SCOPE — DO NOT IMPLEMENT

The following are explicitly excluded:

- true polygon/mesh 3D model generation;
- AI-generated 3D models;
- WebAR;
- virtual try-on;
- automatic background removal;
- replacing the existing gallery;
- changing product-page layout broadly;
- changing checkout;
- changing payment systems;
- changing authentication;
- changing search;
- changing Supabase authentication/RLS architecture except for the minimum additive 360 metadata needed;
- moving existing media away from Cloudinary;
- introducing a new paid media platform;
- adding a new analytics provider;
- rebuilding the admin panel.

---

# FINAL DIRECTIVE

Implement **only** the optional 360° photographic product viewer described above.

The existing Ruhvi application must continue to behave exactly as before for every product that does not have 360° assets.

The preferred architecture is:

```text
Smartphone 360° photo sequence
        ↓
Existing Cloudinary upload/media system
        ↓
Optional 360 metadata in existing/new isolated Supabase structure
        ↓
Existing React product page
        ↓
Lazy-loaded Product360Viewer
        ↓
Drag / Swipe / Pinch / Wheel Zoom
        ↓
Customer sees and controls the product from every photographed angle
```

The feature should be lightweight, mobile-first, accessible, performant, secure, and completely additive to the existing Ruhvi stack.
