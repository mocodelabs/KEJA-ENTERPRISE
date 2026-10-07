import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  paramName = 'page',
  searchParams = {},
}: {
  currentPage: number
  totalPages: number
  basePath: string
  /** Query param to page on — set this per list when a page renders more than one paginated table. */
  paramName?: string
  /** Other current query params to preserve (e.g. other lists' page numbers) when building prev/next links. */
  searchParams?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages
  const navClass = cn(buttonVariants({ variant: 'outline', size: 'sm' }))
  const disabledClass = cn(navClass, 'pointer-events-none opacity-50')

  function hrefFor(page: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && key !== paramName) params.set(key, value)
    }
    params.set(paramName, String(page))
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <p className="text-sm text-slate-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={hrefFor(currentPage - 1)} className={navClass}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        )}
        {hasNext ? (
          <Link href={hrefFor(currentPage + 1)} className={navClass}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  )
}
