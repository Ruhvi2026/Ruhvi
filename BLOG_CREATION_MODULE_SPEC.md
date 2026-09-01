# Ruhvi Jewels — Blog Creation Module: Functional Specification

**Target:** `operations.ruhvi.in` (extend existing CMS section)
**Audience:** AI coding agent implementing on the existing Ruhvi Next.js + Supabase codebase
**Status:** `blog_posts` table exists (minimal schema). `POST /api/external/blog` endpoint exists. Storefront `/blog` and `/blog/[slug]` pages exist. This spec describes the full admin blog creation UI within the operations portal.

---

## 0. Context (read first)

The existing `blog_posts` table (`supabase/migrations/0007_phase6_marketing.sql`) has these columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `title` | `text NOT NULL` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `excerpt` | `text` | |
| `content` | `text NOT NULL` | HTML body |
| `cover_image` | `text` | Cloudinary URL |
| `is_published` | `boolean DEFAULT false` | |
| `published_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `created_by_api_key` | `uuid FK -> api_keys.id` | nullable, for external API posts |

**This spec extends the schema and builds a full admin UI.** No existing column, row, or frontend route is modified. The storefront blog pages (`/blog`, `/blog/[slug]`) remain unchanged.

Existing infrastructure reused:
- **Cloudinary** (`src/services/cloudinaryService.ts`) — unsigned upload preset for image uploads
- **AI engine** (`src/lib/ai/index.ts`) — `generateAIContent()` with feature-based provider routing and fallback chain
- **Operations layout** (`src/app/operations/layout.tsx`) — add a "Blog Posts" nav item under the WEBSITE CMS section
- **Server actions pattern** (`src/app/operations/cms/actions.ts`) — `'use server'` + `requireAdminClient()` + `revalidatePath()`
- **Supabase RLS** — existing policy allows public read of published posts; admin write enforced server-side

---

## 1. Database Schema Changes

### 1.1 Migration: Extend `blog_posts` table

New columns added (all nullable, additive only):

```sql
-- SEO fields
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS h1_tag text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[],
  ADD COLUMN IF NOT EXISTS canonical_url text;

-- Author & categorization
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[];

-- Media
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_image_alt text;

-- Workflow state
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published'));

-- Timestamps
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
```

### 1.2 New table: `blog_media`

```sql
CREATE TABLE IF NOT EXISTS public.blog_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  public_id text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  width integer,
  height integer,
  file_size_bytes integer,
  mime_type text DEFAULT 'image/webp',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all media
CREATE POLICY "Admins can manage blog media"
  ON public.blog_media FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

### 1.3 New table: `blog_revisions`

```sql
CREATE TABLE IF NOT EXISTS public.blog_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  title text NOT NULL,
  excerpt text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.blog_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blog revisions"
  ON public.blog_revisions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

---

## 2. Technical Requirements

### 2.1 Content Editor

**Rich text editor:** Use `@tiptap/react` (TipTap, already in common Next.js ecosystem) with extensions:
- Heading (h2, h3, h4 — h1 reserved for the SEO H1 field)
- Bold, Italic, Underline, Strikethrough
- Bullet list, Ordered list
- Blockquote
- Link (with target="_blank" toggle)
- Image insertion (opens media browser, not direct URL paste)
- Horizontal rule
- Text align (left, center)
- Undo/Redo history
- Placeholder extension: "Start writing your blog post..."

**Title input:**
- Single-line `<input>` above the editor, `font-serif text-3xl font-bold`
- Character counter displayed at right
- Typing in the title triggers debounced slug generation (see 2.3)

**Excerpt input:**
- `<textarea>` below the editor with 2-3 line height
- Soft limit: 160 characters, hard limit: 320 characters
- Live counter: `{current}/160 (soft) — {current}/320 (hard)`

**Draft auto-save:**
- On every content change, debounce 15 seconds, then persist via server action
- First save creates the row (status='draft'); subsequent saves update it
- Visual indicator: "Saving..." -> "Saved at {time}" -> "Draft saved"
- On error: "Failed to save. Retrying..." with a manual Retry button
- Draft auto-save only fires when `status === 'draft'`

**Review workflow:**
- **Submit for Review** button transitions `status` from `draft` -> `review`, sets `submitted_for_review_at`
- Reviewer sees a "Review" tab: diff preview of latest revision vs. current content, approve/reject buttons
- **Approve:** `status` -> `published`, `is_published` -> true, `published_at` -> now() (if null)
- **Reject:** `status` -> `draft`, optional rejection note stored in a new `review_notes` column
- Revisions snapshot taken on each submit-for-review

**Publishing:**
- **Publish Now** button (visible when status is draft or review): sets `status='published'`, `is_published=true`, `published_at` to now() (if not already set)
- **Schedule** button: opens a date-time picker; sets `scheduled_publish_at` (new column) and `status='scheduled'`
- Cron job (pg_cron or Vercel Cron) checks `scheduled_publish_at <= now()` and `status='scheduled'` every 15 minutes, flips to published
- **Unpublish** button (visible when published): sets `status='draft'`, `is_published=false`, preserves `published_at` for re-publish

### 2.2 Media Management

**Upload flow:**
- Uses existing `cloudinaryService.ts` `uploadAttachment()` function
- Drag-and-drop zone or click-to-browse, accepts `image/*` (JPEG, PNG, WebP, GIF)
- Client-side validation: max 10 MB per file, max 20 files per upload batch
- Loading state: per-file progress bar during upload

**Cloudinary transformation:**
- On upload success, apply `f_auto,q_auto` via `getOptimizedImageUrl()` automatically
- Store both the raw `secure_url` and the optimized URL in the `blog_media` table
- Store `public_id` for future deletion

**Alt-text enforcement:**
- After upload completes, a modal or inline field appears for each image requiring alt-text input
- The alt-text field is required before the image can be inserted into the editor
- If the user closes the modal without alt-text, the image remains in the media library but is flagged with a warning badge
- Stored in `blog_media.alt_text`

**Media browser (insert into editor):**
- Grid view of all media attached to the current post
- Click an image to insert its `<img>` tag (with `alt` attribute) into the editor at cursor position
- Each thumbnail shows: image preview, alt-text, file size, delete button
- Empty state: "No media uploaded yet. Drag & drop images above."

**Image compression:**
- On upload, Cloudinary handles compression via `f_auto,q_auto` transformation
- Additionally, store `width` and `height` from the Cloudinary response for responsive image sizing

### 2.3 SEO Configuration Suite

**SEO Title Tag:**
- `<input>` field, pre-filled with the blog title when empty
- Character counter: `{current}/60` (recommended max for SERP display)
- Live preview: "Google SERP Preview" card showing:
  - Blue link: `{meta_title}`
  - Green URL: `{base_url}/blog/{slug}`
  - Description: `{meta_description}`

**H1 Tag:**
- `<input>` field, pre-filled with the blog title when empty
- H1 is rendered as the `<h1>` on the post page (replaces the current hardcoded `<h1>` in `blog/[slug]/page.tsx`)

**Keyword management:**
- Tag-style input: type a keyword, press Enter or comma, it becomes a pill/badge
- Each pill has an × to remove
- Stored as `text[]` in `seo_keywords`
- Displayed below the SERP preview as CSV: `meta_keywords` content

**Automated URL slug:**
- On title input with a 500ms debounce, call a server action that slugifies the title
- Slugification: `.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`
- Check uniqueness against existing `blog_posts.slug` values; if taken, append `-2`, `-3`, etc.
- The slug field is editable by the user (override the auto-generated value)
- Slug field shows a "Lock" icon toggle: when locked, auto-generation is disabled; when unlocked, typing in the title re-generates the slug

**AI-powered meta description generation:**
- "Generate with AI" button next to the meta description field
- On click, calls the AI engine via a server action:
  - Feature key: `blog_meta_description` (to be registered in `ai_features` settings)
  - Prompt: `"Generate a compelling meta description (max 160 characters) for a blog post titled '{title}' with excerpt '{excerpt}'. Focus on the key value proposition and include relevant keywords."`
  - Response is inserted into the meta description textarea
- Loading state: button shows a spinner, disabled during generation
- If the AI feature is disabled or errored, show: "AI generation unavailable. Try again later." and fall back to manual input
- The generated description is editable after insertion

---

## 3. User Workflow Steps

### 3.1 Creating a New Post

1. User navigates to `operations.ruhvi.in/cms/blog` (new route)
2. Clicks **"New Post"** button
3. Empty editor loads with:
   - Title input (empty, placeholder "Post title")
   - Rich text editor (empty, placeholder "Start writing...")
   - Right sidebar collapsed showing: SEO panel, Media panel, Publish panel
4. User types a title → slug auto-generates after 500ms debounce
5. User writes content in the editor
6. Auto-save fires 15s after the last keystroke → row created in `blog_posts` with `status='draft'`
7. A toast confirms "Draft saved" with the timestamp

### 3.2 Adding Media

1. User opens the Media panel (right sidebar) or clicks "Insert Image" in the editor toolbar
2. Drag-and-drop zone appears
3. User drops image files → per-file progress bars show upload progress
4. Each completed upload shows an alt-text input field
5. User enters alt text for each image (required; field shows red border if empty)
6. Once alt-text is provided, images appear in the media grid
7. User clicks an image in the grid → it's inserted into the editor at cursor position with `alt` attribute

### 3.3 Configuring SEO

1. User expands the "SEO" accordion panel in the right sidebar
2. SEO Title field: auto-filled with post title, user edits if needed
3. H1 Tag field: auto-filled with post title, user edits if needed
4. Keywords input: user types "jewellery" + Enter → pill appears; adds "gold ring" → second pill
5. Slug field: auto-generated, editable. User can toggle the lock icon to disable auto-generation
6. Meta Description: user types manually or clicks **"Generate with AI"**
   - AI button shows loading spinner for ~3-5 seconds
   - Result appears in the textarea; user can edit it
7. SERP preview card at the top of the SEO panel updates in real-time as fields change

### 3.4 Review Workflow

1. User finishes writing, clicks **"Submit for Review"** in the Publish panel
2. A confirmation dialog: "Submit this post for review? The editor will be locked."
3. User confirms → status changes to `review`, a revision snapshot is saved
4. Post appears in the reviewer's queue at `operations.ruhvi.in/cms/blog/review`
5. Reviewer opens the post → sees a split view:
   - Left: latest revision content (read-only)
   - Right: current published content (if was previously published), or empty
6. Reviewer can **Approve** (publishes) or **Reject** (sends back to draft with notes)
7. If rejected, the original author sees a notification badge and the rejection note when they open the post

### 3.5 Publishing

1. Two paths:
   - **Publish Now:** Click "Publish" button → instant publish, toast "Post published!"
   - **Schedule:** Click "Schedule" → date-time picker opens → pick time → "Scheduled for {date}"
2. After publishing, the post is live at `/blog/{slug}`
3. "Unpublish" button becomes available to take the post down

### 3.6 Editing an Existing Post

1. User navigates to `operations.ruhvi.in/cms/blog` → sees a table of all posts
2. Table columns: Title, Status, Author, Category, Updated, Published
3. Click a row → editor loads with existing content
4. Edits are auto-saved as drafts
5. If the post was published, changes are saved as a new draft revision; the published version remains live until re-published

---

## 4. Suggested UI Layout

### 4.1 Route Structure

```
operations.ruhvi.in/cms/blog                  → Blog post list table
operations.ruhvi.in/cms/blog/new              → New post editor
operations.ruhvi.in/cms/blog/[id]/edit        → Edit existing post
operations.ruhvi.in/cms/blog/review           → Review queue (for reviewers)
```

### 4.2 Post List Page (`/cms/blog`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Search...]                    [Filter: All Status ▾]  [+ New Post] │
├──────┬────────┬────────┬────────┬──────────┬──────────┬──────────────┤
│ Title│ Status │ Author │  Cat.  │ Updated  │ Published│ Actions      │
├──────┼────────┼────────┼────────┼──────────┼──────────┼──────────────┤
│ How… │ Draft  │ Priya  │ Guide  │ 2h ago   │ —        │ [Edit] [Del] │
│ Top… │ Review │ Ankit  │ Tips   │ 1d ago   │ —        │ [Edit] [Del] │
│ The… │ ✓ Live │ Priya  │ Story  │ 3d ago   │ 28 Aug   │ [Edit] [Unp] │
│ …    │ ⏰ Sched│ Rahul  │ News   │ 5d ago   │ 5 Sep    │ [Edit] [Unp] │
└──────┴────────┴────────┴────────┴──────────┴──────────┴──────────────┘
```

- Status badges: `Draft` (gray), `Review` (amber), `✓ Published` (green), `⏰ Scheduled` (blue)
- Each row clickable (opens editor)
- Bulk actions: checkbox column + "Delete Selected" button
- Empty state: "No blog posts yet. Create your first post." with a CTA button

### 4.3 Post Editor Page (`/cms/blog/new` or `/cms/blog/[id]/edit`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Posts          [Draft saved at 2:34 PM]  ● ○ ○          │
├────────────────────────────────┬────────────────────────────────────┤
│                                │  SEO & Publishing                 │
│  ┌──────────────────────────┐  │  ┌──────────────────────────────┐ │
│  │  Post Title (h1-style)   │  │  │  SERP Preview                │ │
│  │  ─────────────────────── │  │  │  ┌────────────────────────┐  │ │
│  │                          │  │  │  │ 🔗 ruhvi.in/blog/...   │  │ │
│  │  Rich Text Editor        │  │  │  │ Post Title Here         │  │ │
│  │  ┌──────────────────────┐│  │  │  │ Meta description...     │  │ │
│  │  │ [B] [I] [U] [H2]     ││  │  │  └────────────────────────┘  │ │
│  │  │ [List] [Quote] [Link] ││  │  ├──────────────────────────────┤ │
│  │  │───────────────────────││  │  │  ⚙️ SEO                     │ │
│  │  │                       ││  │  │  SEO Title: [___________]   │ │
│  │  │ Start writing...      ││  │  │  H1 Tag:    [___________]   │ │
│  │  │                       ││  │  │  Slug:      [___________] 🔒│ │
│  │  └──────────────────────┘│  │  │  Keywords:  [jewellery]× [+] │ │
│  │                          │  │  │  Meta Desc: [___________]     │ │
│  │  Excerpt:                │  │  │            [✨ Generate AI]   │ │
│  │  ┌──────────────────────┐│  │  ├──────────────────────────────┤ │
│  │  │ [textarea 2-3 lines] ││  │  │  🖼️ Media                   │ │
│  │  │ 0/160                ││  │  │  ┌────────────────────────┐  │ │
│  │  └──────────────────────┘│  │  │  │ 📁 Drop images here    │  │ │
│  │                          │  │  │  │    or click to browse  │  │ │
│  │                          │  │  │  └────────────────────────┘  │ │
│  └──────────────────────────┘  │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐    │ │
│                                │  │  │img│ │img│ │img│ │ + │    │ │
│                                │  │  └───┘ └───┘ └───┘ └───┘    │ │
│                                │  ├──────────────────────────────┤ │
│                                │  │  📄 Details                  │ │
│                                │  │  Category: [Select ▾]       │ │
│                                │  │  Tags:      [tag1]× [tag2]× │ │
│                                │  │  Cover Image: [Browse]       │ │
│                                │  │  Cover Alt:  [___________]   │ │
│                                │  ├──────────────────────────────┤ │
│                                │  │  🚀 Publish                  │ │
│                                │  │  [📝 Save as Draft]          │ │
│                                │  │  [🔍 Submit for Review]      │ │
│                                │  │  [🌐 Publish Now]            │ │
│                                │  │  [⏰ Schedule…]              │ │
│                                │  └──────────────────────────────┘ │
├────────────────────────────────┴────────────────────────────────────┤
│  Footer: auto-save status | word count | character count            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Review Queue Page (`/cms/blog/review`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Review Queue (3 pending)        [Filter: All ▾]                    │
├──────┬────────┬──────────┬──────────┬──────────┬────────────────────┤
│ Title│ Author │ Submitted│ Duration │ Actions                        │
├──────┼────────┼──────────┼──────────┼────────────────────────────────┤
│ How… │ Priya  │ 2h ago   │ 2h       │ [Review]                       │
│ Top… │ Ankit  │ 1d ago   │ 24h ⚠️   │ [Review]                       │
└──────┴────────┴──────────┴──────────┴────────────────────────────────┘
```

**Review detail view (opened by clicking [Review]):**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue           Reviewing: "How to Style Gold..."       │
├───────────────────────────────┬─────────────────────────────────────┤
│  Revision (submitted)         │  Currently Published (if any)       │
│  ┌─────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │                         │  │  │                               │  │
│  │  Read-only editor       │  │  │  Read-only editor             │  │
│  │  content                │  │  │  content (or empty)           │  │
│  │                         │  │  │                               │  │
│  └─────────────────────────┘  │  └───────────────────────────────┘  │
│                                │                                      │
│  Review Notes:                 │  Actions:                             │
│  ┌─────────────────────────┐  │  [✅ Approve & Publish]                │
│  │ [textarea for rejection]│  │  [❌ Send Back to Draft]               │
│  └─────────────────────────┘  │                                      │
└───────────────────────────────┴──────────────────────────────────────┘
```

---

## 5. Server Actions

Following the existing pattern in `src/app/operations/cms/actions.ts`:

| Action | Purpose |
|---|---|
| `createBlogPost(formData)` | Create initial draft row, return `{ id }` |
| `updateBlogPost(id, formData)` | Save draft content, title, excerpt, etc. |
| `getBlogPost(id)` | Fetch full post data for editing |
| `listBlogPosts(filters)` | Paginated table data with status filter |
| `submitForReview(id)` | Set status='review', snapshot revision, set `submitted_for_review_at` |
| `approvePost(id)` | Set status='published', is_published=true, published_at if null |
| `rejectPost(id, notes)` | Set status='draft', store rejection note |
| `publishPost(id)` | Instant publish |
| `schedulePost(id, timestamp)` | Set status='scheduled', scheduled_publish_at |
| `unpublishPost(id)` | Set status='draft', is_published=false |
| `uploadBlogMedia(postId, file)` | Upload to Cloudinary, create `blog_media` row |
| `deleteBlogMedia(id)` | Delete from Cloudinary + remove row |
| `generateMetaDescription(title, excerpt)` | Call AI engine, return generated text |
| `generateSlug(title, existingId?)` | Slugify + uniqueness check, return slug |

---

## 6. AI Integration

### 6.1 Feature Registration

Register a new AI feature in `settings.ai_features` (Supabase `store_settings` table):

```json
{
  "blog_meta_description": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 150
  }
}
```

### 6.2 Server Action Implementation

The `generateMetaDescription` action calls `generateAIContent('blog_meta_description', systemPrompt, userPrompt)` from `src/lib/ai/index.ts`. The existing routing engine handles provider fallback, rate limiting, and cost logging.

### 6.3 Error Handling

- If the AI feature is disabled → return `{ error: 'AI meta description generation is currently disabled.' }`
- If the provider fails → return `{ error: 'Generation failed. Please try again or write manually.' }`
- Timeout set to 15 seconds; if exceeded, fall back to a truncated excerpt-based description

---

## 7. Navigation & Permissions

### 7.1 Nav Addition

In `src/app/operations/layout.tsx`, add a child item under the "WEBSITE CMS" section:

```typescript
{
  label: 'Blog Posts',
  href: '/operations/cms/blog',
  icon: BookOpen,
  requiredPermission: 'cms.blog',
}
```

### 7.2 Permission Scopes

| Scope | Action |
|---|---|
| `cms.blog` | View blog list, create/edit own drafts |
| `cms.blog.review` | Access review queue, approve/reject |
| `cms.blog.publish` | Publish/schedule/unpublish without review |

---

## 8. Storefront Integration

The existing `blog/[slug]/page.tsx` and `blog/page.tsx` require no changes to display published posts. However, to leverage the new SEO fields:

- `blog/[slug]/page.tsx` `generateMetadata()` should read `meta_title`, `meta_description`, `seo_keywords`, `canonical_url` from the query if populated, falling back to current behavior
- The `<h1>` in the article body should use `h1_tag` from the DB if set, else fall back to `title`
- Cover image should use `cover_image_alt` as the `alt` attribute

These changes are **non-breaking** — old posts without the new fields render identically to today.

---

## 9. Implementation Order

| Phase | Scope | Est. |
|---|---|---|
| 1 | Schema migration (new columns, `blog_media`, `blog_revisions`) | 1 session |
| 2 | Server actions (CRUD, media upload, slug generation) | 1 session |
| 3 | Post list page (`/cms/blog`) | 1 session |
| 4 | Post editor page (TipTap editor, sidebar panels, auto-save) | 2 sessions |
| 5 | SEO panel (SERP preview, slug, keywords, AI meta gen) | 1 session |
| 6 | Media panel (upload, alt-text, browser, insert) | 1 session |
| 7 | Review workflow (submit, queue, approve/reject, revisions) | 1 session |
| 8 | Publish/schedule/unpublish + cron job | 1 session |
| 9 | Storefront SEO field integration | 0.5 session |
| 10 | Permissions, nav, polish | 0.5 session |