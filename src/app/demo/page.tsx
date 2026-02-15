'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'

export default function DemoPage() {
    const [status, setStatus] = useState<'loading' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const loginDemoUser = async () => {
            try {
                // Credenciales del usuario demo
                const email = 'demo@salespulse.com'
                const password = 'DemoUser2026!'

                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) {
                    console.error('Demo login error:', error)
                    setStatus('error')
                    setErrorMessage(error.message)
                    return
                }

                // Login exitoso
                router.push('/summary')
                router.refresh()
            } catch (err) {
                setStatus('error')
                setErrorMessage('Error inesperado al iniciar la demo.')
            }
        }

        loginDemoUser()
    }, [router, supabase.auth])

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="text-center max-w-md w-full">
                {status === 'loading' ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 animate-pulse flex items-center justify-center">
                                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Preparando tu Experiencia</h2>
                        <p className="text-slate-400">Ingresando a la sesión de demostración...</p>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-red-400" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Error de Acceso</h3>
                        <p className="text-slate-400 mb-6">
                            No se pudo iniciar la sesión de demostración.
                            <br />
                            <span className="text-sm text-red-400 mt-2 block">{errorMessage}</span>
                        </p>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left mb-6">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Para el Administrador:</p>
                            <p className="text-sm text-slate-300 mb-1">Asegúrate de crear este usuario en Supabase:</p>
                            <ul className="text-sm text-slate-400 space-y-1 font-mono">
                                <li>Email: demo@salespulse.com</li>
                                <li>Pass: DemoUser2026!</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
