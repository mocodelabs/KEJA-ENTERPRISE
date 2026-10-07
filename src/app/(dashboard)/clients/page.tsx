import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
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
import { Pagination } from '@/components/dashboard/pagination'
import { ClientForm } from '@/components/clients/client-form'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { deleteOwnerClient } from '@/lib/actions/clients'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) redirect('/dashboard')

  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: clients, count }, { data: properties }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, properties(name)', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('properties')
      .select('id, name')
      .eq('org_id', active.org_id)
      .is('client_id', null)
      .order('name'),
  ])

  const propertyOptions = (properties ?? []).map((p) => ({ id: p.id, name: p.name }))

  return (
    <div>
      <PageHeader
        title="Owner Clients"
        description="Property owners you manage properties on behalf of — every owner is pegged to a property."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add owner</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm properties={propertyOptions} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 h-fit">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients && clients.length > 0 ? (
                  clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/clients/${c.id}`} className="font-medium text-emerald-700 hover:underline">
                          {c.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.properties && c.properties.length > 0
                          ? c.properties.map((p) => p.name).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>{c.phone || c.email || '—'}</TableCell>
                      <TableCell className="text-right">
                        <DeleteButton action={deleteOwnerClient.bind(null, c.id)} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={4}>No owners yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/clients" />
        </Card>
      </div>
    </div>
  )
}
