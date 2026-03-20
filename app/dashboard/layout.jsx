import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DashboardThemeProvider from '@/components/layout/DashboardThemeProvider'
import DashboardThemeToggle from '@/components/dashboard/DashboardThemeToggle'

export const metadata = {
  title: 'Dashboard - EkahNews',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <DashboardThemeProvider>
      <div className="flex h-screen bg-muted/30">
        {/* Sidebar - Hidden on mobile, shown on lg+ */}
        <DashboardNav user={user} userRole={userData?.role} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header - Hidden on mobile */}
          <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-background border-b border-border">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your content</p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{userData?.role}</p>
              </div>
              <DashboardThemeToggle />
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardThemeProvider>
  )
}

