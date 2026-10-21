import { NavLink } from 'react-router'
import { bottomNav } from '@/config/nav'
import { useAllowedNav } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const items = useAllowedNav(bottomNav)
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md auto-cols-fr grid-flow-col">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
