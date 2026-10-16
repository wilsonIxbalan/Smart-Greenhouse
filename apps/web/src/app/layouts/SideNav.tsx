import { NavLink } from 'react-router'
import { bottomNav, secondaryNav, type NavItem } from '@/config/nav'
import { OpenAlertsBadge } from '@/features/alerts/OpenAlertsBadge'
import { useAllowedNav } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'

function SideNavList({ items }: { items: readonly NavItem[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, badge }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon aria-hidden className="size-5" />
            {label}
            {badge === 'openAlerts' && <OpenAlertsBadge className="ml-auto" />}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function SideNav() {
  const primary = useAllowedNav(bottomNav)
  const secondary = useAllowedNav(secondaryNav)
  return (
    <nav
      aria-label="Menú lateral"
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-4 border-r px-3 py-4 lg:flex"
    >
      <SideNavList items={primary} />
      {secondary.length > 0 && (
        <div className="border-t pt-4">
          <SideNavList items={secondary} />
        </div>
      )}
    </nav>
  )
}
