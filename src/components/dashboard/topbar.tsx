import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { OrgSwitcher } from '@/components/dashboard/org-switcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OrgMembership } from '@/lib/session'
import { LogOut, Settings } from 'lucide-react'

export function Topbar({
  memberships,
  active,
  userEmail,
}: {
  memberships: OrgMembership[]
  active: OrgMembership
  userEmail: string
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 print:hidden">
      <div className="flex items-center gap-3">
        <OrgSwitcher memberships={memberships} activeOrgId={active.org_id} />
        <Badge variant="info" className="capitalize">
          {active.role}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-500 sm:inline">{userEmail}</span>
        <Link href="/settings/profile" title="Settings">
          <Button type="button" variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
