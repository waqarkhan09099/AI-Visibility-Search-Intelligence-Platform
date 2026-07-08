import { NavLink } from 'react-router-dom'
import { BarChart3, LayoutDashboard, Menu, Plus, Settings, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/profiles/new', label: 'Create Profile', icon: Plus },
  { to: '/settings/ai', label: 'AI Configuration', icon: Settings },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold">AI Search Visibility</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <NavItems />
      </div>
    </aside>
  )
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Search Visibility</span>
        </div>
        <NavItems />
      </SheetContent>
    </Sheet>
  )
}

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="lg:hidden flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Search Visibility</span>
        </div>
      </div>
      <p className="hidden text-sm text-muted-foreground sm:block">Search Visibility Platform</p>
      <ThemeToggle />
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
