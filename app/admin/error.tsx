'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the real error in the console (the default Next.js screen hides it).
    console.error('[admin] dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full bg-white rounded-[24px] p-8 shadow-custom">
        <h1 className="font-dm-sans font-bold text-green-deep text-[1.75rem] mb-2">
          Something went wrong loading the dashboard
        </h1>
        <p className="font-dm-sans text-text-mid text-[1rem] mb-6">
          The admin panel hit an unexpected error. The details below identify what failed —
          please share them so it can be fixed.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 mb-6">
          <p className="font-mono text-sm text-red-700 break-words whitespace-pre-wrap">
            {error?.name ? `${error.name}: ` : ''}
            {error?.message || 'Unknown error'}
          </p>
          {error?.digest && (
            <p className="font-mono text-xs text-red-500 mt-2">digest: {error.digest}</p>
          )}
          {error?.stack && (
            <pre className="font-mono text-[11px] leading-relaxed text-red-500 mt-3 whitespace-pre-wrap break-words max-h-64 overflow-auto">
              {error.stack}
            </pre>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => reset()}
            className="bg-gold text-green-deep px-6 py-3 rounded-[50px] font-dm-sans font-bold text-[1rem] transition-all hover:bg-gold-light"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="border border-gray-300 text-green-deep px-6 py-3 rounded-[50px] font-dm-sans font-semibold text-[1rem] transition-all hover:bg-gray-50"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
