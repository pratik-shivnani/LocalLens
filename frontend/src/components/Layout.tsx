import { Outlet, NavLink } from 'react-router-dom'
import { Image, Search, Users, FolderInput, Settings, Shield } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: Image, label: 'Gallery' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/import', icon: FolderInput, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <img 
        src="/logo.png" 
        alt="LocalLens" 
        className="w-10 h-10 rounded-xl shadow-lg"
      />
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900/50 backdrop-blur-xl text-white flex flex-col border-r border-gray-800/50">
        {/* Logo & Brand */}
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                LocalLens
              </h1>
              <p className="text-xs text-gray-500">Privacy-first AI Photos</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">100% Local Processing</span>
          </div>
          <p className="text-center text-xs text-gray-600 mt-3">v1.0.0</p>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-950">
        <Outlet />
      </main>
    </div>
  )
}
