import { Outlet, NavLink } from 'react-router-dom'
import { Image, Search, Users, FolderInput, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: Image, label: 'Gallery' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/import', icon: FolderInput, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image className="w-6 h-6" />
            Photo Organiser
          </h1>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-800 text-sm text-gray-500">
          v0.1.0 - Local ML Photos
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
