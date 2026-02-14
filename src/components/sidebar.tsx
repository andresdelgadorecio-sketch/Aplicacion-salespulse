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
    ShieldCheck,
    Menu,
    X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useUserRole } from '@/hooks/use-user-role'

const navItems = [
    { href: '/summary', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/opportunities', icon: TrendingUp, label: 'Oportunidades' },
    { href: '/risks', icon: AlertTriangle, label: 'Riesgos' },
    { href: '/analyzer', icon: BarChart3, label: 'Analizador' },
    { href: '/upload', icon: Upload, label: 'Cargar Datos' },
    { href: '/admin/users', icon: ShieldCheck, label: 'Usuarios' },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { role, loading } = useUserRole()

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const filteredNavItems = navItems.filter(item => {
        if (loading) return false;

        if (item.href.startsWith('/admin') && role !== 'admin') {
            return false;
        }

        if (!role || role === 'admin') return true;

        if (role === 'commercial') {
            return item.href !== '/analyzer';
        }

        if (role === 'supervisor') {
            return item.href !== '/upload';
        }

        return true;
    })

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Mobile Header Trigger */}
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-4 z-40">
                <Link href="/summary" className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-base leading-tight">Sales Pulse</h1>
                    </div>
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Aside */}
            <aside
                className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 
                    w-64 ${collapsed ? 'md:w-20' : 'md:w-64'} 
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo Section */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                    <Link href="/summary" className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <div>
                                <h1 className="text-white font-bold text-lg leading-tight">
                                    Sales Pulse
                                </h1>
                                <p className="text-slate-500 text-xs">Forecast 2026</p>
                                <p className="text-amber-500 text-[10px]">Rol: {loading ? '...' : (role || 'Sin rol')}</p>
                            </div>
                        )}
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden text-slate-400 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    {filteredNavItems.map((item) => {
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
                                {(!collapsed || mobileOpen) && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                                {isActive && (!collapsed || mobileOpen) && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-indigo-400" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-800 space-y-2">
                    {/* Collapse Button (Desktop Only) */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-full items-center justify-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
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
                        {(!collapsed || mobileOpen) && <span className="font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
