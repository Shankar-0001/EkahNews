'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tag,
  Users,
  Image,
  LogOut,
  Newspaper,
  Clapperboard,
  Menu,
  X,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardNav({ user, userRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Articles',
      href: '/dashboard/articles',
      icon: FileText,
    },
    {
      title: 'Categories',
      href: '/dashboard/categories',
      icon: FolderOpen,
      adminOnly: true,
    },
    {
      title: 'Tags',
      href: '/dashboard/tags',
      icon: Tag,
    },
    {
      title: 'Authors',
      href: '/dashboard/authors',
      icon: Users,
      adminOnly: true,
    },
    {
      title: 'Media',
      href: '/dashboard/media',
      icon: Image,
    },
    {
      title: 'Web Stories',
      href: '/dashboard/web-stories',
      icon: Clapperboard,
    },
  ]

  const filteredItems = navItems.filter(item => !item.adminOnly || userRole === 'admin')

  return (
    <>
      {/* Mobile toggle */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Link href="/" className="flex items-center space-x-2">
            <Newspaper className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">EkahNews</span>
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-background border-r border-border flex flex-col transition-transform duration-300 z-40 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'pt-16 lg:pt-0'
        )}
      >
        {/* Logo */}
        <div className="hidden lg:flex p-6 border-b border-border">
          <Link href="/" className="flex items-center space-x-3 w-full">
            <Newspaper className="h-8 w-8 text-primary" />
            <div>
              <div className="font-bold text-foreground">EkahNews</div>
              <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                <span className="flex-1">{item.title}</span>
                {isActive && <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <Link href="/dashboard/settings" className="w-full">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-muted"
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-muted"
            onClick={(e) => {
              e.preventDefault()
            }}
          >
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{user?.email?.split('@')[0]}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}

