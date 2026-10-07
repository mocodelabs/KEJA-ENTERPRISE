export const PAGE_SIZE = 10

export function parsePage(pageParam: string | undefined): number {
  const page = Number(pageParam)
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

/** Inclusive [from, to] row range for a Supabase `.range()` call. */
export function getPageRange(page: number, pageSize: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return [from, to]
}

export function getTotalPages(count: number | null, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil((count ?? 0) / pageSize))
}
