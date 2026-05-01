import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import FloatingTimer from './FloatingTimer'
import { useLang } from '@/hooks/useLang'

export default function AppLayout() {
  useLang() // applies dir/lang to <html> element
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <FloatingTimer />
    </div>
  )
}
