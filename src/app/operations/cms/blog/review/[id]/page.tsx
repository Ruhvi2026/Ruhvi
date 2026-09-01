import { getBlogPost } from '../../actions';
import { notFound } from 'next/navigation';
import ReviewDetail from '../ReviewDetail';

export const metadata = {
  title: 'Review Blog Post - Operations',
};

export default async function ReviewBlogPostPage({
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
      <ReviewDetail postId={resolvedParams.id} />
    </div>
  );
}
