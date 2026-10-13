import { requireActiveOrg } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await requireActiveOrg()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:block print:h-auto print:overflow-visible">
      <Sidebar orgType={active.organization.org_type} />
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <Topbar memberships={memberships} active={active} userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  )
}
