import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import DemoBanner from './DemoBanner'
import './Layout.css'

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <DemoBanner />
        <TopBar />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
