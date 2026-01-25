'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
                return
            }

            router.push('/summary')
            router.refresh()
        } catch (err) {
            setError('Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-950 to-slate-950" />

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">SP</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-white text-center mb-2">
                        Sales Pulse
                    </h1>
                    <p className="text-slate-400 text-center mb-8">
                        Forecast Commander 2026
                    </p>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p className="mt-6 text-center text-slate-400">
                        ¿No tienes cuenta?{' '}
                        <Link
                            href="/register"
                            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                            Regístrate
                        </Link>
                    </p>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-20 -right-20 h-40 w-40 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-indigo-600/10 rounded-full blur-3xl" />
            </div>
        </div>
    )
}
