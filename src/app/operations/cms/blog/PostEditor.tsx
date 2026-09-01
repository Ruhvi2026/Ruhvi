'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image as ImageIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Save,
  Eye,
  EyeOff,
  CalendarClock,
  X,
  Sparkles,
  Lock,
  Unlock,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBlogPost,
  updateBlogPost,
  generateSlug,
  generateMetaDescription,
  addBlogMedia,
  listBlogMedia,
  updateBlogMediaAltText,
  deleteBlogMedia,
  submitForReview,
  publishPost,
  schedulePost,
  unpublishPost,
} from './actions';
import type { BlogPostRow, BlogMediaRow } from './actions';
import { uploadAttachment } from '@/services/cloudinaryService';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SAVE_DEBOUNCE_MS = 15000;
const SLUG_DEBOUNCE_MS = 500;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PostEditorProps {
  initialData?: BlogPostRow;
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PostEditor({ initialData }: PostEditorProps) {
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(initialData?.id || null);

  // Core fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [coverImage, setCoverImage] = useState(initialData?.cover_image || '');
  const [coverImageAlt, setCoverImageAlt] = useState(
    initialData?.cover_image_alt || ''
  );

  // SEO fields
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(
    initialData?.meta_description || ''
  );
  const [h1Tag, setH1Tag] = useState(initialData?.h1_tag || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [slugLocked, setSlugLocked] = useState(
    Boolean(initialData?.slug && initialData?.slug !== 'untitled')
  );
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.seo_keywords || []
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Workflow / meta
  const status = initialData?.status || 'draft';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Media
  const [media, setMedia] = useState<BlogMediaRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaAltDraft, setMediaAltDraft] = useState<Record<string, string>>(
    {}
  );

  // UI
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    seo: Boolean(initialData),
    media: true,
    details: false,
    publish: true,
  });
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleForSlugRef = useRef(title);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener' },
      }),
      Image.configure({ HTMLAttributes: { class: 'blog-editor-image' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your blog post...' }),
    ],
    content: initialData?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-stone prose-invert max-w-none focus:outline-none',
      },
    },
    onUpdate: () => {
      dirtyRef.current = true;
      scheduleSave();
    },
  });

  // ---------------------------------------------------------------------------
  // Auto-save
  // ---------------------------------------------------------------------------

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    fd.set('title', title);
    fd.set('excerpt', excerpt);
    fd.set('category', category);
    fd.set('cover_image', coverImage);
    fd.set('cover_image_alt', coverImageAlt);
    fd.set('meta_title', metaTitle);
    fd.set('meta_description', metaDescription);
    fd.set('h1_tag', h1Tag);
    fd.set('slug', slug);
    fd.set('seo_keywords', keywords.join(','));
    fd.set('tags', tags.join(','));
    fd.set('content', editor?.getHTML() || '');
    return fd;
  }, [
    title,
    excerpt,
    category,
    coverImage,
    coverImageAlt,
    metaTitle,
    metaDescription,
    h1Tag,
    slug,
    keywords,
    tags,
    editor,
  ]);

  const performSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (!title.trim()) return;

    setSaveStatus('saving');
    const fd = buildFormData();

    if (!postId) {
      const result = await createBlogPost(fd);
      if (result.success && result.id) {
        setPostId(result.id);
        dirtyRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString());
        if (!slug) setSlug(result.slug || '');
        router.replace(`/operations/cms/blog/${result.id}/edit`, {
          scroll: false,
        });
      } else {
        setSaveStatus('error');
        toast.error(result.error || 'Failed to save draft');
      }
      return;
    }

    const result = await updateBlogPost(postId, fd);
    if (result.success) {
      dirtyRef.current = false;
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      setSaveStatus('error');
      toast.error(result.error || 'Failed to save draft');
    }
  }, [postId, title, buildFormData, router, slug]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, SAVE_DEBOUNCE_MS);
  }, [performSave]);

  // Flush pending auto-save when the editor unmounts (e.g. navigating away).
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        performSave();
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset save status back to idle after a moment
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      if (saveStatusTimeoutRef.current)
        clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 4000);
    }
  }, [saveStatus]);

  // Manual save button
  const handleManualSave = () => {
    dirtyRef.current = true;
    performSave();
  };

  // ---------------------------------------------------------------------------
  // Slug auto-generation
  // ---------------------------------------------------------------------------

  const handleTitleChange = (value: string) => {
    setTitle(value);
    titleForSlugRef.current = value;
    if (!slugLocked) {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
      slugTimerRef.current = setTimeout(() => {
        if (!value.trim()) return;
        generateSlug(value, postId || undefined).then((res) => {
          if (res.success && res.slug) setSlug(res.slug);
        });
      }, SLUG_DEBOUNCE_MS);
    }
  };

  // ---------------------------------------------------------------------------
  // Keywords / tags
  // ---------------------------------------------------------------------------

  const addKeyword = () => {
    const k = keywordInput.trim().toLowerCase();
    if (!k) return;
    if (keywords.includes(k)) {
      setKeywordInput('');
      return;
    }
    setKeywords([...keywords, k]);
    setKeywordInput('');
    dirtyRef.current = true;
  };

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((x) => x !== k));
    dirtyRef.current = true;
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
    dirtyRef.current = true;
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
    dirtyRef.current = true;
  };

  // ---------------------------------------------------------------------------
  // AI meta description
  // ---------------------------------------------------------------------------

  const handleAiGenerate = async () => {
    if (!title.trim()) {
      toast.error('Add a title first so the AI has context.');
      return;
    }
    setIsAiGenerating(true);
    try {
      const fd = new FormData();
      fd.set('title', title);
      fd.set('excerpt', excerpt);
      fd.set('seo_keywords', keywords.join(','));
      const result = await generateMetaDescription(fd);
      if (result.success) {
        setMetaDescription(result.meta_description || '');
        dirtyRef.current = true;
        toast.success('Meta description generated');
      } else {
        toast.error(result.error || 'Generation failed');
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Media upload / management
  // ---------------------------------------------------------------------------

  const loadMedia = useCallback(async () => {
    if (!postId) return;
    const rows = await listBlogMedia(postId);
    setMedia(rows);
  }, [postId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!postId) {
      toast.error(
        'Save the draft first (add a title and wait a moment), then upload media.'
      );
      return;
    }
    const fileArray = Array.from(files);
    if (fileArray.length > 20) {
      toast.error('Maximum 20 files per upload batch.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let done = 0;
    const total = fileArray.length;
    const newMedia: BlogMediaRow[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
        done += 1;
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10 MB.`);
        done += 1;
        continue;
      }
      try {
        const res = (await uploadAttachment(file)) as any;
        const mediaRow = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          post_id: postId,
          url: res.secure_url,
          public_id: res.public_id || '',
          alt_text: '',
          width: res.width || null,
          height: res.height || null,
          file_size_bytes: res.bytes || null,
          mime_type: `image/${res.format || 'webp'}`,
          sort_order: 0,
          created_at: new Date().toISOString(),
        } as BlogMediaRow;
        newMedia.push(mediaRow);
      } catch (err: any) {
        toast.error(`Upload failed for ${file.name}: ${err.message}`);
      }
      done += 1;
      setUploadProgress(Math.round((done / total) * 100));
    }

    if (newMedia.length > 0) {
      // Persist to blog_media (require alt text before insert is allowed; store empty for now)
      for (const m of newMedia) {
        const fd = new FormData();
        fd.set('post_id', postId);
        fd.set('url', m.url);
        fd.set('public_id', m.public_id);
        fd.set('width', m.width ? String(m.width) : '');
        fd.set('height', m.height ? String(m.height) : '');
        fd.set(
          'file_size_bytes',
          m.file_size_bytes ? String(m.file_size_bytes) : ''
        );
        fd.set('mime_type', m.mime_type || 'image/webp');
        const result = await addBlogMedia(fd);
        if (result.success) {
          m.id = result.id!;
        }
      }
      setMedia((prev) => [...prev, ...newMedia]);
      toast.success(
        `${newMedia.length} image(s) uploaded. Add alt text before inserting.`
      );
    }
    setUploading(false);
  };

  const handleAltTextSave = async (mediaId: string, alt: string) => {
    const result = await updateBlogMediaAltText(mediaId, alt);
    if (result.success) {
      setMedia((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, alt_text: alt } : m))
      );
      toast.success('Alt text saved');
    } else {
      toast.error(result.error || 'Failed to save alt text');
    }
  };

  const handleMediaDelete = async (mediaId: string) => {
    if (!confirm('Delete this media item?')) return;
    const result = await deleteBlogMedia(mediaId);
    if (result.success) {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success('Media deleted');
    } else {
      toast.error(result.error || 'Failed to delete media');
    }
  };

  const insertMediaIntoEditor = (mediaItem: BlogMediaRow) => {
    if (!mediaItem.alt_text.trim()) {
      toast.error(
        'Add alt text before inserting this image (accessibility requirement).'
      );
      return;
    }
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({ src: mediaItem.url, alt: mediaItem.alt_text })
      .run();
    toast.success('Image inserted');
  };

  // ---------------------------------------------------------------------------
  // Workflow actions
  // ---------------------------------------------------------------------------

  const requireSaved = (): boolean => {
    if (!postId) {
      toast.error(
        'Save the draft first before publishing or submitting for review.'
      );
      return false;
    }
    return true;
  };

  const handleSubmitReview = async () => {
    if (!requireSaved()) return;
    if (!title.trim() || !editor?.getText().trim()) {
      toast.error(
        'Title and content are required before submitting for review.'
      );
      return;
    }
    dirtyRef.current = true;
    await performSave();
    const result = await submitForReview(postId!);
    if (result.success) {
      toast.success('Submitted for review');
      router.push('/operations/cms/blog');
    } else {
      toast.error(result.error || 'Failed to submit for review');
    }
  };

  const handlePublish = async () => {
    if (!requireSaved()) return;
    if (!title.trim() || !editor?.getText().trim()) {
      toast.error('Title and content are required before publishing.');
      return;
    }
    dirtyRef.current = true;
    await performSave();
    const result = await publishPost(postId!);
    if (result.success) {
      toast.success('Post published!');
      router.push('/operations/cms/blog');
    } else {
      toast.error(result.error || 'Failed to publish post');
    }
  };

  const handleSchedule = async () => {
    if (!requireSaved()) return;
    if (!scheduleAt) {
      toast.error('Pick a date and time to schedule.');
      return;
    }
    dirtyRef.current = true;
    await performSave();
    const result = await schedulePost(
      postId!,
      new Date(scheduleAt).toISOString()
    );
    if (result.success) {
      toast.success('Post scheduled');
      router.push('/operations/cms/blog');
    } else {
      toast.error(result.error || 'Failed to schedule post');
    }
  };

  const handleUnpublish = async () => {
    if (!requireSaved()) return;
    const result = await unpublishPost(postId!);
    if (result.success) {
      toast.success('Post unpublished');
      router.push('/operations/cms/blog');
    } else {
      toast.error(result.error || 'Failed to unpublish post');
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const serpUrl = slug ? `/blog/${slug}` : '/blog/your-post-slug';

  const wordCount = editor?.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;

  const renderPanelHeader = (
    key: string,
    icon: React.ReactNode,
    title: string,
    right?: React.ReactNode
  ) => (
    <button
      onClick={() => togglePanel(key)}
      className="flex w-full items-center gap-2 border-b border-white/10 px-4 py-3 text-left"
    >
      {icon}
      <span className="flex-1 text-sm font-semibold text-slate-200">
        {title}
      </span>
      {right}
      {openPanels[key] ? (
        <ChevronDown className="h-4 w-4 text-slate-500" />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-500" />
      )}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/operations/cms/blog')}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#151520] px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </button>
          <h1 className="text-xl font-bold text-white">
            {postId ? 'Edit Post' : 'New Post'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Saved{lastSavedAt ? ` at ${lastSavedAt}` : ''}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </span>
          )}
          <button
            onClick={handleManualSave}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#151520] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ------------------------- Main column ------------------------- */}
        <div className="space-y-4">
          {/* Title input */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title"
              className="w-full border-0 bg-transparent px-5 pb-2 pt-4 font-serif text-3xl font-bold text-white placeholder-slate-600 focus:outline-none"
            />
            <div className="flex items-center justify-between px-5 pb-3">
              <span className="text-xs text-slate-500">Title</span>
              <span className="text-xs text-slate-500">
                {title.length} chars
              </span>
            </div>
          </div>

          {/* Rich text editor */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 p-2">
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBold().run()}
                active={editor?.isActive('bold')}
                label={<Bold className="h-4 w-4" />}
                title="Bold"
              />
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                active={editor?.isActive('italic')}
                label={<Italic className="h-4 w-4" />}
                title="Italic"
              />
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                active={editor?.isActive('underline')}
                label={<UnderlineIcon className="h-4 w-4" />}
                title="Underline"
              />
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                active={editor?.isActive('strike')}
                label={<Strikethrough className="h-4 w-4" />}
                title="Strikethrough"
              />
              <div className="mx-1 h-5 w-px bg-white/10" />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
                active={editor?.isActive('heading', { level: 2 })}
                label={<Heading2 className="h-4 w-4" />}
                title="Heading 2"
              />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 3 }).run()
                }
                active={editor?.isActive('heading', { level: 3 })}
                label={<Heading3 className="h-4 w-4" />}
                title="Heading 3"
              />
              <div className="mx-1 h-5 w-px bg-white/10" />
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                active={editor?.isActive('bulletList')}
                label={<List className="h-4 w-4" />}
                title="Bullet List"
              />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                active={editor?.isActive('orderedList')}
                label={<ListOrdered className="h-4 w-4" />}
                title="Ordered List"
              />
              <ToolbarButton
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                active={editor?.isActive('blockquote')}
                label={<Quote className="h-4 w-4" />}
                title="Blockquote"
              />
              <div className="mx-1 h-5 w-px bg-white/10" />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().setTextAlign('left').run()
                }
                active={editor?.isActive({ textAlign: 'left' })}
                label={<AlignLeft className="h-4 w-4" />}
                title="Align Left"
              />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().setTextAlign('center').run()
                }
                active={editor?.isActive({ textAlign: 'center' })}
                label={<AlignCenter className="h-4 w-4" />}
                title="Align Center"
              />
              <ToolbarButton
                onClick={() =>
                  editor?.chain().focus().setHorizontalRule().run()
                }
                label={<Minus className="h-4 w-4" />}
                title="Horizontal Rule"
              />
              <ToolbarButton
                onClick={() => {
                  const url = prompt('Enter link URL:');
                  if (url) {
                    editor?.chain().focus().setLink({ href: url }).run();
                  }
                }}
                active={editor?.isActive('link')}
                label={<Link2 className="h-4 w-4" />}
                title="Add Link"
              />
              <ToolbarButton
                onClick={() => {
                  const mediaItem = media.find(
                    (m) => m.alt_text.trim().length > 0
                  );
                  if (mediaItem) {
                    insertMediaIntoEditor(mediaItem);
                  } else {
                    toast.error(
                      'Upload and add alt text to an image first (Media panel).'
                    );
                  }
                }}
                label={<ImageIcon className="h-4 w-4" />}
                title="Insert Image"
              />
            </div>
            <div className="min-h-[420px] p-5">
              <EditorContent editor={editor} />
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-slate-500">
              <span>{wordCount} words</span>
              <span>{editor?.getText().length || 0} characters</span>
            </div>
          </div>

          {/* Excerpt */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            <label className="block px-4 pt-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => {
                if (e.target.value.length <= 320) {
                  setExcerpt(e.target.value);
                  dirtyRef.current = true;
                }
              }}
              placeholder="Short summary shown on the blog grid and in search results (max 320 chars)."
              rows={3}
              className="w-full resize-y border-0 bg-transparent px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none"
            />
            <div className="px-4 pb-3 text-right text-xs text-slate-500">
              {excerpt.length}/320
            </div>
          </div>
        </div>

        {/* ------------------------- Sidebar ------------------------- */}
        <div className="space-y-4">
          {/* SEO panel */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            {renderPanelHeader(
              'seo',
              <Sparkles className="h-4 w-4 text-indigo-400" />,
              'SEO'
            )}
            {openPanels.seo && (
              <div className="space-y-4 p-4">
                {/* SERP preview */}
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Google SERP Preview
                  </p>
                  <p className="truncate text-lg text-blue-400">
                    {metaTitle || title || 'Post Title Here'}
                  </p>
                  <p className="text-xs text-emerald-500">{serpUrl}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                    {metaDescription ||
                      excerpt ||
                      'Meta description preview...'}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    SEO Title Tag
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value);
                      dirtyRef.current = true;
                    }}
                    maxLength={60}
                    placeholder={title || 'Post title'}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {metaTitle.length}/60
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    H1 Tag
                  </label>
                  <input
                    type="text"
                    value={h1Tag}
                    onChange={(e) => {
                      setH1Tag(e.target.value);
                      dirtyRef.current = true;
                    }}
                    placeholder={title || 'Post title'}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-white/10 bg-black/20">
                      <span className="pl-3 text-xs text-slate-500">
                        /blog/
                      </span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value);
                          dirtyRef.current = true;
                        }}
                        className="w-full border-0 bg-transparent px-1 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setSlugLocked(!slugLocked)}
                      className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                      title={
                        slugLocked
                          ? 'Unlock to auto-generate from title'
                          : 'Lock to keep slug fixed'
                      }
                    >
                      {slugLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Keywords
                  </label>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300"
                      >
                        {k}
                        <button
                          onClick={() => removeKeyword(k)}
                          className="text-indigo-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      placeholder={
                        keywords.length === 0 ? 'Add keyword, press Enter' : ''
                      }
                      className="min-w-[120px] flex-1 border-0 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-400">
                      Meta Description
                    </label>
                    <button
                      onClick={handleAiGenerate}
                      disabled={isAiGenerating}
                      className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isAiGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Generate with AI
                    </button>
                  </div>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => {
                      if (e.target.value.length <= 160) {
                        setMetaDescription(e.target.value);
                        dirtyRef.current = true;
                      }
                    }}
                    rows={3}
                    maxLength={160}
                    placeholder="AI-generated or write manually (max 160 chars)"
                    className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {metaDescription.length}/160
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Media panel */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            {renderPanelHeader(
              'media',
              <ImageIcon className="h-4 w-4 text-indigo-400" />,
              'Media'
            )}
            {openPanels.media && (
              <div className="space-y-3 p-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center transition-colors hover:border-indigo-500 hover:bg-black/30"
                >
                  <Upload className="mb-2 h-6 w-6 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Drop images here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    JPEG, PNG, WebP · max 10 MB each · up to 20 files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {uploading && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {media.length === 0 && !uploading ? (
                  <p className="py-2 text-center text-xs text-slate-500">
                    No media yet. Upload images above, add alt text, then
                    insert.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((m) => (
                      <div
                        key={m.id}
                        className="group relative overflow-hidden rounded-lg border border-white/10 bg-black/20"
                      >
                        <img
                          src={m.url}
                          alt={m.alt_text || 'Uploaded image'}
                          className="aspect-square w-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <input
                            type="text"
                            value={mediaAltDraft[m.id] ?? m.alt_text}
                            onChange={(e) =>
                              setMediaAltDraft((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const val = (
                                mediaAltDraft[m.id] ?? m.alt_text
                              ).trim();
                              if (val !== m.alt_text) {
                                handleAltTextSave(m.id, val);
                              }
                            }}
                            placeholder="Alt text"
                            className="mb-1 w-full rounded border border-white/20 bg-black/60 px-1 py-0.5 text-[10px] text-white placeholder-slate-400 focus:outline-none"
                          />
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => insertMediaIntoEditor(m)}
                              disabled={!m.alt_text.trim()}
                              className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                              title={
                                m.alt_text.trim()
                                  ? 'Insert into editor'
                                  : 'Add alt text first'
                              }
                            >
                              Insert
                            </button>
                            <button
                              onClick={() => handleMediaDelete(m.id)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {!m.alt_text.trim() && (
                          <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 py-0.5 text-[8px] font-bold uppercase text-black">
                            Alt required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            {renderPanelHeader(
              'details',
              <BookOpen className="h-4 w-4 text-indigo-400" />,
              'Details'
            )}
            {openPanels.details && (
              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      dirtyRef.current = true;
                    }}
                    placeholder="e.g. Guide, Story, Tips"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-200"
                      >
                        {t}
                        <button
                          onClick={() => removeTag(t)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder={
                        tags.length === 0 ? 'Add tag, press Enter' : ''
                      }
                      className="min-w-[100px] flex-1 border-0 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Cover Image URL
                  </label>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => {
                      setCoverImage(e.target.value);
                      dirtyRef.current = true;
                    }}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {media.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {media.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setCoverImage(m.url);
                            dirtyRef.current = true;
                            toast.success('Cover image set');
                          }}
                          className="relative h-12 w-12 overflow-hidden rounded border border-white/10 transition-colors hover:border-indigo-500"
                          title="Use as cover image"
                        >
                          <img
                            src={m.url}
                            alt={m.alt_text || 'Media option'}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Cover Image Alt Text
                  </label>
                  <input
                    type="text"
                    value={coverImageAlt}
                    onChange={(e) => {
                      setCoverImageAlt(e.target.value);
                      dirtyRef.current = true;
                    }}
                    placeholder="Describe the cover image for accessibility"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Publish panel */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
            {renderPanelHeader(
              'publish',
              <Eye className="h-4 w-4 text-indigo-400" />,
              'Publish'
            )}
            {openPanels.publish && (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-xs font-medium text-slate-400">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : status === 'review'
                          ? 'bg-amber-500/10 text-amber-400'
                          : status === 'scheduled'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {status === 'published' && <Eye className="mr-1 h-3 w-3" />}
                    {status === 'scheduled' && (
                      <CalendarClock className="mr-1 h-3 w-3" />
                    )}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                {status === 'published' ? (
                  <button
                    onClick={handleUnpublish}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                  >
                    <EyeOff className="h-4 w-4" />
                    Unpublish
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSubmitReview}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      <Eye className="h-4 w-4" />
                      Submit for Review
                    </button>

                    <button
                      onClick={handlePublish}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                      <Eye className="h-4 w-4" />
                      Publish Now
                    </button>

                    {showSchedule ? (
                      <div className="space-y-2">
                        <input
                          type="datetime-local"
                          value={scheduleAt}
                          onChange={(e) => setScheduleAt(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSchedule}
                            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                          >
                            Confirm Schedule
                          </button>
                          <button
                            onClick={() => setShowSchedule(false)}
                            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowSchedule(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#151520] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <CalendarClock className="h-4 w-4" />
                        Schedule...
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TipTap image styling */}
      <style jsx global>{`
        .blog-editor-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .tiptap.ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #64748b;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active,
  label,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  label: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-indigo-500/20 text-indigo-400'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
