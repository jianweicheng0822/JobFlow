import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import DemoBanner from './DemoBanner'
import DemoChecklist from './DemoChecklist'
import { preloadPages } from '../routes/lazyPages'
import './Layout.css'

export default function Layout() {
  useEffect(() => {
    // Wait until the first page has settled so preloading doesn't compete with it
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preloadPages, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(preloadPages, 1500)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <DemoBanner />
        <TopBar />
        <main className="layout-content">
          {/* Only the page area waits on a lazy chunk; sidebar and top bar stay put */}
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <DemoChecklist />
    </div>
  )
}
