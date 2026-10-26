---
name: ruhvi-product-photography
description: Analyze jewelry reference images and generate photorealistic, luxury commercial product photography for Ruhvi Jewels (ruhvi.in) while strictly preserving exact product design and geometry. Use whenever the user asks to generate, edit, stage, or enhance jewelry product photos, catalog images, model-wearing shots, macro close-ups, editorial blog imagery, or campaign banners for Ruhvi Jewels.
allowed-tools: image_gen google default_api
---
# Ruhvi Product Photography

A visual production skill for analyzing jewelry reference images and generating photorealistic, commercial-grade imagery for Ruhvi Jewels (`ruhvi.in`) across e-commerce product listings, galleries, model-wearing shots, macro close-ups, editorial articles, and campaign banners.

Every generated image must balance three priorities in strict order:

1. **Product identity and design fidelity** (always takes priority over artistic creativity)
2. **Premium photographic quality**
3. **Consistency with Ruhvi Jewels' visual identity**

## When to Use

- Generating e-commerce product listing, gallery, or product detail page (PDP) photos from raw jewelry reference images
- Transforming ordinary jewelry snapshots into studio-grade luxury product photography
- Creating model-wearing photographs featuring an existing Ruhvi catalog product
- Generating macro or close-up detail shots of stone settings, clasps, chains, or surface textures
- Producing editorial, lifestyle, blog, or campaign banner visuals for Ruhvi Jewels

## Core Rule: Product Identity Lock

The user-supplied product reference is the authoritative source of truth. Improve the photography, lighting, environment, composition, and presentation, but **never redesign the product**. A beautiful image that alters the physical product is commercially misleading and incorrect.

### 1. Record Visible Characteristics

Before generating any image, inspect all supplied reference images collectively and record the visible defining features:

- **Category**: Rings, stud/hoop/drop earrings, necklaces, pendants, chains, bracelets, bangles, anklets, nose pins/rings, mangalsutra, bridal sets, men's or kids' jewelry.
- **Geometry & Proportions**: Overall shape, silhouette, outline, relative dimensions, band/bangle width, chain thickness, curvature, and depth.
- **Components & Stones**: Exact count, arrangement, shapes, sizes, colors, and settings of stones, pearls, beads, or decorative elements.
- **Surface & Hardware**: Metal tone and finish (polished, matte, textured), decorative motifs, engravings, grooves, chains, links, clasps, hooks, hinges, posts, openings, and asymmetry.

Distinguish observation from inference. Describe visible appearance (e.g., "gold-toned", "silver-toned", "pearl-like", "stone-set") rather than inventing unverified material certifications or gemstone identities.

### 2. Prohibited Design Changes

Never intentionally or silently allow generation to:

- Change the product's shape, silhouette, band/bangle width, or chain thickness.
- Add, remove, duplicate, or rearrange gemstones, pearls, beads, engravings, or decorative components.
- Alter the structure of clasps, hooks, posts, chains, links, joints, or attachments.
- Change the metal color or finish without explicit authorization.
- Simplify intricate details or embellish a simple piece into a more elaborate design.
- Invent hidden geometry (e.g., backside patterns, hidden clasps, internal band structure) not visible in the references.

### 3. Multi-Image Analysis & Requesting Missing Views

When multiple reference images are provided:

- Analyze all angles together to establish one unified product identity, separating real features from lighting artifacts, reflections, or shadows.
- Before generating, ask: *"Can the requested image be produced without inventing, changing, or guessing an important product feature?"*
- If a required feature is hidden, blurry, or ambiguous (e.g., unclear ring side profile, hidden earring rear post, obscured stone setting, or conflicting reference photos), stop and request specific views (e.g., *"Please provide one close-up of the side profile and one photograph of the back of the product to preserve the original structure"*).

## Brand Visual Direction (Ruhvi Jewels)

Ensure every image feels part of one coherent luxury brand (`ruhvi.in`):

- **Primary Brand Reference**: When web access or existing brand assets are available, align with the current `ruhvi.in` aesthetic, aspect ratios, spacing, and gallery treatments. Never claim to have inspected website assets that were not accessed.
- **Warm Luxury Palette**: Select complementary tones suited to the piece and placement, such as warm ivory, soft cream, champagne gold, warm beige, light taupe, mocha brown, muted cocoa, or subtle amber accents. Adapt contrast to the piece (e.g., warm ivory or soft beige for clean catalog galleries; muted mocha or darker backgrounds for high-contrast campaign drama). Avoid forcing every image onto the exact same background color mechanically.
- **Photographic Quality**:
  - **Lighting**: Soft, controlled studio illumination with natural highlights, balanced exposure, realistic metallic reflections, and soft, well-defined shadows. Avoid artificial glow, blown-out highlights, or shadows that hide design details.
  - **Material Realism**: Render authentic metallic reflections, distinct stone facets, and natural pearl luster without turning gold-toned metal unnaturally yellow or plastic-looking.
  - **Backgrounds & Props**: Keep backgrounds clean with balanced negative space. Props (silk, stone textures, stands, florals) must remain subordinate, never obscure product details, and never look attached to the jewelry itself.

## Output Modes

Select the mode that matches the requested task and set the corresponding aspect ratio:

- **Mode A: E-commerce Product Image**: Clean, distraction-free Ruhvi background, full product visibility, generous breathing room, and sharp focus on details. Default to square (`1:1`) for product galleries unless specified otherwise.
- **Mode B: Premium Studio Photography**: Elevate a raw reference photo with controlled studio lighting, refined shadows/reflections, and a complementary luxury surface while keeping the physical item identical.
- **Mode C: Model-Wearing Photography**: Pass the original product references in `image_references`. Use anatomically realistic hands, ears, necks, and skin tones with physically plausible placement. Never obscure key product details with hair, fingers, or clothing, and never resize or reshape the jewelry to fit the pose. Portrait (`4:5` or `3:4`) works well for lifestyle/model placements.
- **Mode D: Macro and Detail Photography**: Focus closely on a genuine feature visible in the references (stone setting, clasp, engraving) without fabricating microscopic details or exaggerating relative proportions.
- **Mode E: Blog and Editorial Photography**: Match the article's subject (styling, jewelry care, occasion storytelling). If featuring a catalog item, enforce full design preservation; if creating a general educational illustration, do not imply the illustrative piece is an actual catalog product. Use landscape (`16:9` or `3:2`) for blog headers.
- **Mode F: Collection, Campaign, and Banner Photography**: Use horizontal (`16:9` or `21:9`), vertical (`9:16`), or square (`1:1`) framing with intentional negative space for layout placement. Never add promotional text, logos, prices, or discount badges unless explicitly requested.

## Step-by-Step Execution Workflow

1. **Understand the Request**: Identify the target output mode, placement, aspect ratio, and number of images needed.
2. **Inspect References**: View all supplied product reference images (using `view_file` if stored in the workspace or inspecting attached file references).
3. **Lock Product Identity**: Catalog the category, geometry, stone count/arrangement, metal finish, and hardware. Check if references are sufficient; if critical angles are missing, ask the user before generating.
4. **Construct the Generation Call**:
   - Always call `image_gen:generate_image` and pass all relevant product reference IDs in `image_references` whenever generating or editing an actual product so the model conditions directly on the original item.
   - Lead the `query` with explicit instructions to preserve the exact product structure, silhouette, stone count, and metal tone from the reference image while transforming only the studio lighting, background, and framing.
   - Specify the appropriate `aspect_ratio` (`1:1`, `4:5`, `16:9`, etc.).
5. **Inspect and Validate**: Visually compare the generated output against the original reference images using the checklists below:
   - **Product Fidelity Check**: Verify category, silhouette, geometry, proportions, component/stone count and arrangement, stone shapes/sizes, decorative patterns, metal color/finish, clasps/connectors, and absence of melted, duplicated, or invented details.
   - **Photographic Quality Check**: Verify realistic studio lighting, natural reflections, clear contours, sharpness, clean background, proper framing, and absence of unintended watermarks or text.
6. **Correct or Regenerate**: If the generated image alters any identifiable product feature, reject it and regenerate or refine using `image_references`. If the tool repeatedly alters intricate details after reasonable attempts, report the limitation transparently rather than approving an inaccurate product photo.
7. **Deliver the Structured Report**: Embed the generated image inline (`![image_name](filename)`) and present the concise quality report below.

## Output Response Format

Provide this structured summary with every completed generation:

- **Task**: State the requested image type and mode.
- **Product Classification**: Identify the jewelry category and visible material appearance.
- **Reference Coverage**: State how many reference images were analyzed and whether additional views are needed.
- **Generated Asset**: Display the image inline and note its reference/filename.
- **Visual Treatment**: Briefly describe the background, lighting, composition, and brand palette used.
- **Product Fidelity Review**: List the key physical features verified against the reference and note any discrepancies.
- **Quality Status**: Assign one of:
  - `PASS - PRODUCT IDENTITY ACCEPTABLE`
  - `REGENERATE - CORRECTABLE DEFECT`
  - `NEEDS MORE REFERENCES`
  - `UNRESOLVED - DO NOT PUBLISH`
- **Technical Details**: Report verified aspect ratio, dimensions, or format when inspected.

## Gotchas

- **Never skip `image_references` for catalog products**: Generating from a text description alone will invent a new jewelry design. Always pass the user's product reference image IDs into `image_gen:generate_image` via `image_references`.
- **Never claim unverified perfection**: AI image generation can subtly shift micro-pave stones, chain links, or reflections. Always inspect the output honestly and flag any discrepancy rather than assuming 100% geometric identity.
- **Separate generation from publishing**: Generating an image in chat does not automatically upload or publish it to `ruhvi.in` or the repository unless an explicit deployment step is requested and executed.
