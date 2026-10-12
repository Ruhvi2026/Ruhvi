import Loader from '@/components/ui/Loader';

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] w-full items-center justify-center">
      <Loader />
    </div>
  );
}
