import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Receipt,
  CreditCard,
  FileSignature,
  MessageSquare,
  Wallet,
  BarChart3,
  Briefcase,
  Boxes,
  Wrench,
} from 'lucide-react'
import { isPropertyManager } from '@/lib/orgAccess'
import type { Enums } from '@/lib/types/database'

/** pmOnly items only make sense for orgs managing property on someone else's behalf — see lib/orgAccess.ts. */
export type NavItem = { label: string; href: string; icon: LucideIcon; pmOnly?: boolean }
export type NavSection = { title: string; items: NavItem[] }

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Properties',
    items: [
      { label: 'Properties', href: '/properties', icon: Building2 },
      { label: 'Owner Clients', href: '/clients', icon: Briefcase, pmOnly: true },
    ],
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Tenants', href: '/tenants', icon: Users },
      { label: 'Leases', href: '/leases', icon: FileSignature },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Invoices', href: '/billing/invoices', icon: FileText },
      { label: 'Meter Readings', href: '/billing/meter-readings', icon: Receipt },
    ],
  },
  {
    title: 'Maintenance',
    items: [{ label: 'Maintenance', href: '/maintenance', icon: Wrench }],
  },
  {
    title: 'Payments',
    items: [
      { label: 'Payments', href: '/payments', icon: CreditCard },
      { label: 'Receipts', href: '/receipts', icon: Receipt },
    ],
  },
  {
    title: 'Sales Docs',
    items: [
      { label: 'Quotes', href: '/quotes', icon: FileText },
      { label: 'Credit Notes', href: '/credit-notes', icon: FileText },
    ],
  },
  {
    title: 'Messaging',
    items: [
      { label: 'Templates', href: '/messaging/templates', icon: MessageSquare },
      { label: 'Send Messages', href: '/messaging/send', icon: MessageSquare },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { label: 'Overview', href: '/accounting', icon: Wallet },
      { label: 'Ledger', href: '/accounting/ledger', icon: Wallet },
      { label: 'Expenses', href: '/accounting/expenses', icon: Wallet },
      { label: 'Reconciliation', href: '/accounting/reconciliation', icon: Wallet, pmOnly: true },
    ],
  },
  {
    title: 'Reports',
    items: [{ label: 'Reports', href: '/reports', icon: BarChart3 }],
  },
  {
    title: 'Internal Ops',
    items: [
      { label: 'Employees', href: '/hr/employees', icon: Users },
      { label: 'Payroll', href: '/hr/payroll', icon: Wallet },
      { label: 'Equipment', href: '/assets/equipment', icon: Boxes },
      { label: 'Stationery', href: '/assets/stationery', icon: Boxes },
    ],
  },
]

/** Filters out pmOnly items (and any section left empty as a result) for owner-direct orgs. */
export function getNavSections(orgType: Enums<'org_type'>): NavSection[] {
  if (isPropertyManager(orgType)) return NAV_SECTIONS

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.pmOnly),
  })).filter((section) => section.items.length > 0)
}
