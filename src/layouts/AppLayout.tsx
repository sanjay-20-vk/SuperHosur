import type { ReactNode } from 'react'
import { PwaInstallPrompt, PwaUpdateBanner } from '../components/PwaBanner'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <PwaUpdateBanner />
      <main>{children}</main>
      <PwaInstallPrompt />
    </div>
  )
}
