import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableEmpty } from '@/components/ui/table'
import { EmployeeForm } from '@/components/hr/employee-form'
import { EmployeeRow } from '@/components/hr/employee-row'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: employees, count } = await supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('org_id', active.org_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const contractUrls = new Map<string, string>()
  for (const employee of employees ?? []) {
    if (!employee.contract_url) continue
    const { data: signed } = await supabase.storage
      .from('employee-contracts')
      .createSignedUrl(employee.contract_url, 60 * 10)
    if (signed?.signedUrl) contractUrls.set(employee.id, signed.signedUrl)
  }

  return (
    <div>
      <PageHeader title="Employees" description="Your internal team, for payroll and records." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees && employees.length > 0 ? (
                employees.map((e) => (
                  <EmployeeRow
                    key={e.id}
                    employee={e}
                    contractUrl={contractUrls.get(e.id)}
                    currency={active.organization.currency}
                  />
                ))
              ) : (
                <TableEmpty colSpan={6}>No employees yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/hr/employees" />
      </Card>
    </div>
  )
}
