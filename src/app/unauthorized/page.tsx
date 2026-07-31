import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E7D7A3]/50 rounded-3xl p-8 shadow-xl text-center">
        <div className="inline-flex p-4 rounded-full bg-amber-50 text-[#C29831] mb-4 border border-[#E7D7A3]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#121110] mb-2">Access Restricted</h1>
        <p className="text-sm text-[#121110]/70 mb-8 leading-relaxed">
          You do not have staff or administrator privileges to view this section of Ruhvi.in.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl text-sm font-medium hover:bg-black transition shadow-md w-full"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    </div>
  )
}
