type LedgerRow = {
  property_id: string
  property?: { name: string } | null
  gross_revenue: number
  total_expenses: number
  net_to_owner: number
}

export function computePropertyPerformance(rows: LedgerRow[]) {
  const byProperty = new Map<string, { name: string; grossRevenue: number; expenses: number; net: number }>()

  for (const row of rows) {
    const key = row.property_id
    const existing = byProperty.get(key) ?? {
      name: row.property?.name ?? 'Unknown',
      grossRevenue: 0,
      expenses: 0,
      net: 0,
    }
    existing.grossRevenue += Number(row.gross_revenue)
    existing.expenses += Number(row.total_expenses)
    existing.net += Number(row.net_to_owner)
    byProperty.set(key, existing)
  }

  return Array.from(byProperty.values()).sort((a, b) => b.grossRevenue - a.grossRevenue)
}

type TenantWithInvoices = {
  id: string
  full_name: string
  leases?: {
    invoices?: {
      status: string
      due_date: string
      total_amount: number
      payments?: { amount: number; paid_at: string }[]
    }[]
  }[]
}

export function computeTenantPerformance(tenants: TenantWithInvoices[]) {
  return tenants
    .map((t) => {
      const invoices = (t.leases ?? []).flatMap((l) => l.invoices ?? [])
      const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
      const paidInvoices = invoices.filter((i) => i.status === 'paid')
      const onTimeCount = paidInvoices.filter((i) =>
        (i.payments ?? []).some((p) => new Date(p.paid_at) <= new Date(i.due_date))
      ).length
      const onTimeRate = paidInvoices.length > 0 ? Math.round((onTimeCount / paidInvoices.length) * 100) : null

      let level: 'Excellent' | 'Good' | 'At risk' | 'No history' = 'No history'
      if (onTimeRate !== null) {
        if (onTimeRate >= 90) level = 'Excellent'
        else if (onTimeRate >= 60) level = 'Good'
        else level = 'At risk'
      }

      return { id: t.id, name: t.full_name, totalInvoiced, onTimeRate, level }
    })
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
}

export function computeMonthlyRevenue(payments: { amount: number; paid_at: string }[], months = 6) {
  const now = new Date()
  const buckets: { key: string; label: string; total: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' }),
      total: 0,
    })
  }

  for (const p of payments) {
    const d = new Date(p.paid_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.total += Number(p.amount)
  }

  return buckets
}
