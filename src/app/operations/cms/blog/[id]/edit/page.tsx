import PostEditor from '../../PostEditor';
import { notFound } from 'next/navigation';
import { getBlogPost } from '../../actions';

export const metadata = {
  title: 'Edit Blog Post - Operations',
};

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PostEditor initialData={post} />
    </div>
  );
}
