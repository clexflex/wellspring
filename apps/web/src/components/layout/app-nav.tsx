'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/programs', label: 'Programs' },
  { href: '/audit-logs', label: 'Audit Logs' },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { creator, logout } = useAuth()

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
          <Link href="/programs" className="text-lg font-semibold tracking-tight">
            Wellspring Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right text-sm">
            <p className="font-medium">{creator?.displayName ?? 'Creator'}</p>
            <p className="text-muted-foreground">{creator?.email ?? ''}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout()
              router.replace('/login')
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
