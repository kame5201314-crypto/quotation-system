'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FileText,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  Home,
  CheckSquare,
} from 'lucide-react'

const navigation = [
  { name: '儀表板', href: '/', icon: Home },
  { name: '報價單', href: '/quotes', icon: FileText },
  { name: '客戶管理', href: '/customers', icon: Users },
  { name: '產品管理', href: '/products', icon: Package },
  { name: '定價規則', href: '/pricing', icon: DollarSign },
  { name: '審批中心', href: '/approvals', icon: CheckSquare },
  { name: '分析報表', href: '/analytics', icon: BarChart3 },
  { name: '系統設定', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">報價系統</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            報價單管理系統 v1.0
          </div>
        </div>
      </div>
    </aside>
  )
}
