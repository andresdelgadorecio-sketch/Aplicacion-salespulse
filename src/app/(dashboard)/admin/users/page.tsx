import { getProfiles } from '@/lib/actions/user-actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersTable } from '@/components/admin/users-table'
import { ShieldCheck } from 'lucide-react'
import { CreateUserButton } from '@/components/admin/create-user-button'

export default async function AdminUsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verify Admin Role securely on server side
    // Verify Admin Role securely on server side
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isBypassed = user.email === 'andres.delgado.recio@gmail.com';
    const hasDbRole = currentUserProfile?.role === 'admin';

    if (!isBypassed && !hasDbRole) {
        redirect('/summary') // or 403 page
    }

    const profiles = await getProfiles()

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-indigo-500" />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Administra los roles y permisos de los usuarios del sistema.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 text-amber-400 text-xs hidden sm:block">
                        Los nuevos usuarios tendrán la contraseña que definas aquí.
                    </div>
                    <CreateUserButton />
                </div>
            </div>

            <UsersTable initialProfiles={profiles} />
        </div>
    )
}
