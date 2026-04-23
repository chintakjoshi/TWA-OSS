import type { LucideIcon } from 'lucide-react'
import {
  BellRing,
  BriefcaseBusiness,
  ClipboardList,
  FileClock,
  FileSearch,
  History,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Settings2,
  UserRoundSearch,
  Users,
} from 'lucide-react'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  section:
    | 'overview'
    | 'people'
    | 'employers'
    | 'listings'
    | 'tracking'
    | 'settings'
  badge?:
    | {
        source: 'summary'
        key: 'pending_employers' | 'pending_listings' | 'open_applications'
      }
    | {
        source: 'notifications'
      }
  activePrefixes?: string[]
  inactivePrefixes?: string[]
}

export const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    section: 'overview',
  },
  {
    label: 'Jobseekers',
    href: '/jobseekers',
    icon: Users,
    section: 'people',
  },
  {
    label: 'Match by Jobseeker',
    href: '/matches/jobseekers',
    icon: Search,
    section: 'people',
    activePrefixes: ['/matches/jobseekers'],
  },
  {
    label: 'Approval Queue',
    href: '/employers/queue',
    icon: UserRoundSearch,
    section: 'employers',
    badge: { source: 'summary', key: 'pending_employers' },
    activePrefixes: ['/employers/queue'],
  },
  {
    label: 'All Employers',
    href: '/employers',
    icon: BriefcaseBusiness,
    section: 'employers',
    activePrefixes: ['/employers'],
    inactivePrefixes: ['/employers/queue'],
  },
  {
    label: 'Listing Queue',
    href: '/listings/queue',
    icon: FileClock,
    section: 'listings',
    badge: { source: 'summary', key: 'pending_listings' },
    activePrefixes: ['/listings/queue'],
  },
  {
    label: 'All Listings',
    href: '/listings',
    icon: ClipboardList,
    section: 'listings',
    activePrefixes: ['/listings'],
    inactivePrefixes: ['/listings/queue'],
  },
  {
    label: 'Match by Listing',
    href: '/matches/listings',
    icon: FileSearch,
    section: 'listings',
    activePrefixes: ['/matches/listings'],
  },
  {
    label: 'Application Tracker',
    href: '/applications',
    icon: BellRing,
    section: 'tracking',
    badge: { source: 'summary', key: 'open_applications' },
  },
  {
    label: 'Security',
    href: '/security',
    icon: ShieldCheck,
    section: 'settings',
  },
  {
    label: 'Notification Config',
    href: '/notifications',
    icon: Settings2,
    section: 'settings',
  },
  {
    label: 'Audit Log',
    href: '/audit',
    icon: History,
    section: 'settings',
  },
]
