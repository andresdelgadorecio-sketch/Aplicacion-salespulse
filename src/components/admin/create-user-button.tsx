'use client'

import { useState } from 'react'
import { UserPlus, X, Loader2 } from 'lucide-react'
import { createUser } from '@/lib/actions/user-actions'

export function CreateUserButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'commercial'
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            await createUser(formData)
            setSuccess(true)
            setTimeout(() => {
                setIsOpen(false)
                setSuccess(false)
                setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'commercial' })
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Error al crear usuario')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
            >
                <UserPlus className="h-4 w-4" />
                Crear Usuario
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h3 className="text-lg font-semibold text-white">Nuevo Usuario</h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Nombre</label>
                            <input
                                required name="firstName" value={formData.firstName} onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Apellido</label>
                            <input
                                name="lastName" value={formData.lastName} onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Email</label>
                        <input
                            required type="email" name="email" value={formData.email} onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Contraseña Temporal</label>
                        <input
                            required type="password" name="password" value={formData.password} onChange={handleChange} minLength={6}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase">Rol Inicial</label>
                        <select
                            name="role" value={formData.role} onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="commercial">Comercial</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {/* Feedback */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Usuario creado exitosamente...
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button" onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium text-sm"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
