import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { SendMessageForm } from '@/components/messaging/send-message-form'
import { Pagination } from '@/components/dashboard/pagination'
import { formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function SendMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: tenants }, { data: templates }, { data: properties }, { data: blocks }, { data: log, count }] =
    await Promise.all([
      supabase.from('tenants').select('id, full_name, phone').eq('org_id', active.org_id).order('full_name'),
      supabase.from('message_templates').select('id, name, body').eq('org_id', active.org_id).order('name'),
      supabase.from('properties').select('id, name').eq('org_id', active.org_id).order('name'),
      supabase.from('property_blocks').select('id, property_id, name').eq('org_id', active.org_id).order('name'),
      supabase
        .from('messages_log')
        .select('*, tenant:tenants(full_name)', { count: 'exact' })
        .eq('org_id', active.org_id)
        .order('created_at', { ascending: false })
        .range(from, to),
    ])

  return (
    <div>
      <PageHeader title="Send Messages" description="Send SMS notices individually or in batches." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <SendMessageForm
            tenants={tenants ?? []}
            templates={templates ?? []}
            properties={properties ?? []}
            blocks={blocks ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log && log.length > 0 ? (
                log.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.created_at)}</TableCell>
                    <TableCell>{m.tenant?.full_name ?? m.recipient}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-500">{m.body}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'sent' ? 'success' : m.status === 'failed' ? 'danger' : 'default'}>
                        {m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={4}>No messages sent yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/messaging/send" />
      </Card>
    </div>
  )
}
