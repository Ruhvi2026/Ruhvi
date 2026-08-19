import { createClient } from '@/lib/supabase/server';
import ProductForm from '../ProductForm';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Edit Product - Operations',
};

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      product_images ( id, url, type, sort_order )
    `
    )
    .eq('id', params.id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Sort images if necessary
  if (product.product_images) {
    product.product_images.sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ProductForm initialData={product} isEdit={true} />
    </div>
  );
}
