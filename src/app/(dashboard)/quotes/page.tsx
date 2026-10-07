import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { QuoteForm } from '@/components/quotes/quote-form'
import { QuoteStatusSelect } from '@/components/quotes/quote-status-select'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: quotes, count }, { data: clients }, { data: properties }] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, client:clients(full_name), property:properties(name)', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('clients').select('id, full_name').eq('org_id', active.org_id).order('full_name'),
    supabase.from('properties').select('id, name').eq('org_id', active.org_id).order('name'),
  ])

  return (
    <div>
      <PageHeader title="Quotes" description="Generate and track quotes for clients and properties." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New quote</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteForm
            clients={(clients ?? []).map((c) => ({ id: c.id, label: c.full_name }))}
            properties={(properties ?? []).map((p) => ({ id: p.id, label: p.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote No.</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes && quotes.length > 0 ? (
                quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium text-slate-900">
                      <Link href={`/quotes/${q.id}`} className="text-emerald-700 hover:underline">
                        {q.quote_no}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        {q.client?.full_name ?? q.client_name ?? '—'}
                        {q.client_name && !q.client_id && (
                          <span className="ml-1 text-xs text-slate-400">(prospect)</span>
                        )}
                      </div>
                      {(q.property?.name ?? q.property_label) && (
                        <div className="text-xs text-slate-400">
                          {q.property?.name ?? q.property_label}
                          {q.property_label && !q.property_id && ' (prospect)'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{q.valid_until ? formatDate(q.valid_until) : '—'}</TableCell>
                    <TableCell>{formatMoney(Number(q.total_amount), active.organization.currency)}</TableCell>
                    <TableCell>
                      <QuoteStatusSelect quoteId={q.id} status={q.status} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No quotes yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/quotes" />
      </Card>
    </div>
  )
}
