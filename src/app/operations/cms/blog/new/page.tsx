import PostEditor from '../PostEditor';

export const metadata = {
  title: 'New Blog Post - Operations',
};

export default function NewBlogPostPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PostEditor />
    </div>
  );
}
