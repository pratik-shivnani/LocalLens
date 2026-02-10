import { Outlet, NavLink } from 'react-router-dom'
import { Image, Search, Users, FolderInput, Settings, Shield, Sun, Moon } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../contexts/ThemeContext'

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
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-72 bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl flex flex-col border-r border-gray-200 dark:border-gray-800/50 transition-colors duration-200">
        {/* Logo & Brand */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800/50">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
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
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-800/50">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200 mb-3"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Dark Mode</span>
              </>
            )}
          </button>
          
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">100% Local Processing</span>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-3">v1.0.0</p>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 transition-colors duration-200">
        <Outlet />
      </main>
    </div>
  )
}
