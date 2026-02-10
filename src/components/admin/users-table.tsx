'use client'

import { Profile, updateUserRole } from '@/lib/actions/user-actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { deleteUser } from '@/lib/actions/user-actions'

// Simple utility if @/lib/utils is missing or doesn't have it
const formatDateLocal = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export function UsersTable({ initialProfiles }: { initialProfiles: Profile[] }) {
    const router = useRouter()
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [errorId, setErrorId] = useState<string | null>(null)

    const handleRoleChange = async (userId: string, newRole: Profile['role']) => {
        setUpdatingId(userId)
        setErrorId(null)
        try {
            await updateUserRole(userId, newRole)
            router.refresh()
        } catch (error) {
            console.error('Failed to update role', error)
            setErrorId(userId)
        } finally {
            setUpdatingId(null)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) return

        setUpdatingId(userId)
        try {
            await deleteUser(userId)
            router.refresh()
        } catch (error) {
            console.error('Failed to delete user', error)
            alert('Error al eliminar usuario')
        } finally {
            setUpdatingId(null)
        }
    }

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Fecha Registro</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {initialProfiles.map((profile) => (
                            <tr key={profile.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {profile.first_name} {profile.last_name || ''}
                                </td>
                                <td className="px-6 py-4">
                                    {profile.email || <span className="text-slate-600 italic">No disponible</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={profile.role}
                                            onChange={(e) => handleRoleChange(profile.id, e.target.value as Profile['role'])}
                                            disabled={updatingId === profile.id}
                                            className={`bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${profile.role === 'admin' ? 'text-indigo-400 border-indigo-500/30' :
                                                profile.role === 'supervisor' ? 'text-emerald-400 border-emerald-500/30' :
                                                    'text-slate-300'
                                                }`}
                                        >
                                            <option value="commercial">Comercial</option>
                                            <option value="supervisor">Supervisor</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                        {updatingId === profile.id && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                                        {errorId === profile.id && (
                                            <span title="Error al actualizar">
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {formatDateLocal(profile.created_at)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(profile.id)}
                                        disabled={updatingId === profile.id}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                        title="Eliminar usuario"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {initialProfiles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
