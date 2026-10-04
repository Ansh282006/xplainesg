import { Outlet } from 'react-router-dom'

import { CommandPalette } from '@/components/CommandPalette'
import { PageTransition } from '@/components/PageTransition'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { usePageTitle } from '@/hooks/usePageTitle'

export function AppLayout() {
  const { open, setOpen } = useCommandPalette()
  usePageTitle()

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenCommandPalette={() => setOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}