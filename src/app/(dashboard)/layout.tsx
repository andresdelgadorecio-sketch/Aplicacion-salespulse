import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar />
            <main className="ml-64 min-h-screen transition-all duration-300">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
