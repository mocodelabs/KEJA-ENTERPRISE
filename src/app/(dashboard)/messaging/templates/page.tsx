import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableEmpty,
} from '@/components/ui/table'
import { TemplateForm } from '@/components/messaging/template-form'
import { TemplateRow } from '@/components/messaging/template-row'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: templates, count } = await supabase
    .from('message_templates')
    .select('*', { count: 'exact' })
    .eq('org_id', active.org_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div>
      <PageHeader title="Message Templates" description="Reusable SMS templates for reminders, penalties, and notices." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>New template</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateForm />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 h-fit">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates && templates.length > 0 ? (
                  templates.map((t) => <TemplateRow key={t.id} template={t} />)
                ) : (
                  <TableEmpty colSpan={4}>No templates yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/messaging/templates" />
        </Card>
      </div>
    </div>
  )
}
