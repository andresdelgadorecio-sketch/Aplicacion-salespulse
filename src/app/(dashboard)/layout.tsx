import { Sidebar } from '@/components/sidebar'
import { AIChatWidget } from '@/components/dashboard/ai-chat-widget'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar />
            <main className="md:ml-64 min-h-screen transition-all duration-300 pt-16 md:pt-0">
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
            <AIChatWidget />
        </div>
    )
}
