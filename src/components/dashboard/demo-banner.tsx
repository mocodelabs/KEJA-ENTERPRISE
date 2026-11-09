import { Sparkles } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-violet-600 px-4 py-2 text-center text-sm text-white print:hidden">
      <span className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 shrink-0" />
        You&apos;re exploring a live demo with sample data. Feel free to click around — it resets every hour.
      </span>
      {/* A plain anchor: this leaves the demo session, so it must not be prefetched. */}
      <a href="/demo/exit" className="font-semibold underline underline-offset-2 hover:text-violet-100">
        Create your own account →
      </a>
    </div>
  )
}
