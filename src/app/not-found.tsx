import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 text-stone-400 mb-6">
        <Search className="w-8 h-8" />
      </div>
      
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Page Not Found
      </h1>
      <h2 className="text-xl font-serif text-stone-500 mb-4">Error 404</h2>
      
      <p className="text-stone-500 max-w-md mx-auto mb-8 text-sm">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm">
        <Link 
          href="/"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-900 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        
        <Link 
          href="/collections/all"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-stone-200 text-stone-900 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Shop Collections</span>
        </Link>
      </div>
    </div>
  );
}
