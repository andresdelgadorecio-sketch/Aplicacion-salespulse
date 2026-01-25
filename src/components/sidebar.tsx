'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    AlertTriangle,
    BarChart3,
    Upload,
    LogOut,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
    { href: '/summary', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/risks', icon: AlertTriangle, label: 'Riesgos' },
    { href: '/analyzer', icon: BarChart3, label: 'Analizador' },
    { href: '/upload', icon: Upload, label: 'Cargar Datos' },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [collapsed, setCollapsed] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                <Link href="/summary" className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">
                                Sales Pulse
                            </h1>
                            <p className="text-slate-500 text-xs">Forecast 2026</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon
                                className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                                    }`}
                            />
                            {!collapsed && (
                                <span className="font-medium">{item.label}</span>
                            )}
                            {isActive && !collapsed && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-indigo-400" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 space-y-2">
                {/* Collapse Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                >
                    {collapsed ? (
                        <ChevronRight className="h-5 w-5" />
                    ) : (
                        <>
                            <ChevronLeft className="h-5 w-5" />
                            <span className="font-medium">Colapsar</span>
                        </>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    )
}
