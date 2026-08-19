import ProductForm from '../ProductForm';

export const metadata = {
  title: 'Add New Product - Operations',
};

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <ProductForm isEdit={false} />
    </div>
  );
}
