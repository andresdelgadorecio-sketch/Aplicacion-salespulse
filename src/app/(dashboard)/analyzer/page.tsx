'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Filter, RefreshCw } from 'lucide-react'
import { RevenueBarChart } from '@/components/charts/revenue-bar-chart'
import { DistributionDonut } from '@/components/charts/distribution-donut'

type Country = 'ALL' | 'COLOMBIA' | 'ECUADOR' | 'PERU'

export default function AnalyzerPage() {
    const [selectedCountry, setSelectedCountry] = useState<Country>('ALL')
    const [opportunities, setOpportunities] = useState<any[]>([])
    const [accounts, setAccounts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            const [oppsRes, acctsRes] = await Promise.all([
                supabase.from('opportunities').select('*'),
                supabase.from('accounts').select('*'),
            ])

            setOpportunities(oppsRes.data || [])
            setAccounts(acctsRes.data || [])
            setLoading(false)
        }

        fetchData()
    }, [])

    // Filtrar por país
    const filteredAccounts = selectedCountry === 'ALL'
        ? accounts
        : accounts.filter(a => a.country === selectedCountry)

    const filteredAccountIds = new Set(filteredAccounts.map(a => a.id))
    const filteredOpportunities = opportunities.filter(o =>
        selectedCountry === 'ALL' || filteredAccountIds.has(o.account_id)
    )

    // Datos para gráficos
    const barChartData = [
        { period: 'Ene', actual: 85000, target: 100000 },
        { period: 'Feb', actual: 92000, target: 100000 },
        { period: 'Mar', actual: 110000, target: 100000 },
        { period: 'Abr', actual: 78000, target: 100000 },
        { period: 'May', actual: 105000, target: 100000 },
        { period: 'Jun', actual: 95000, target: 100000 },
    ].map(d => ({
        ...d,
        actual: selectedCountry === 'ALL' ? d.actual : Math.round(d.actual * 0.4),
        target: selectedCountry === 'ALL' ? d.target : Math.round(d.target * 0.4),
    }))

    const statusDistribution = [
        { name: 'Growth', value: filteredAccounts.filter(a => a.status === 'Growth').length || 5, color: '#10b981' },
        { name: 'Stable', value: filteredAccounts.filter(a => a.status === 'Stable').length || 8, color: '#6366f1' },
        { name: 'Risk', value: filteredAccounts.filter(a => a.status === 'Risk').length || 3, color: '#f97066' },
    ]

    const pipelineDistribution = [
        { name: 'Active', value: filteredOpportunities.filter(o => o.status === 'Active').length || 12, color: '#10b981' },
        { name: 'Closed Won', value: filteredOpportunities.filter(o => o.status === 'Closed Won').length || 8, color: '#6366f1' },
        { name: 'Closed Lost', value: filteredOpportunities.filter(o => o.status === 'Closed Lost').length || 4, color: '#f97066' },
    ]

    const countries = ['ALL', 'COLOMBIA', 'ECUADOR', 'PERU'] as const

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-indigo-400" />
                        Analizador
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Filtra y analiza datos por canal y país
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <Filter className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-400 font-medium">Filtrar por País:</span>

                    <div className="flex gap-2">
                        {countries.map((country) => (
                            <button
                                key={country}
                                onClick={() => setSelectedCountry(country)}
                                className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedCountry === country
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {country === 'ALL' ? 'Todos' : country}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Cuentas</p>
                    <p className="text-3xl font-bold text-white">{filteredAccounts.length || 16}</p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Oportunidades</p>
                    <p className="text-3xl font-bold text-white">{filteredOpportunities.length || 24}</p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Pipeline Total</p>
                    <p className="text-3xl font-bold text-white">
                        ${(filteredOpportunities.reduce((s, o) => s + (o.total_amount || 0), 0) || 850000).toLocaleString()}
                    </p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Forecast Ponderado</p>
                    <p className="text-3xl font-bold text-white">
                        ${(filteredOpportunities.reduce((s, o) => s + ((o.total_amount * o.probability / 100) || 0), 0) || 425000).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueBarChart data={barChartData} />

                <DistributionDonut
                    data={statusDistribution}
                    title="Distribución por Estado de Cuenta"
                    centerLabel="Total"
                    centerValue={filteredAccounts.length || 16}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionDonut
                    data={pipelineDistribution}
                    title="Estado del Pipeline"
                    centerLabel="Opps"
                    centerValue={filteredOpportunities.length || 24}
                />

                {/* Accounts List */}
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Cuentas {selectedCountry !== 'ALL' ? `en ${selectedCountry}` : ''}
                    </h3>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {(filteredAccounts.length > 0 ? filteredAccounts : [
                            { name: 'TechCorp', country: 'COLOMBIA', status: 'Growth' },
                            { name: 'InnovaEC', country: 'ECUADOR', status: 'Stable' },
                            { name: 'PeruSoft', country: 'PERU', status: 'Growth' },
                            { name: 'AndesTech', country: 'COLOMBIA', status: 'Risk' },
                            { name: 'QuitoDigital', country: 'ECUADOR', status: 'Stable' },
                        ].filter(a => selectedCountry === 'ALL' || a.country === selectedCountry)).map((account, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                                <div>
                                    <p className="text-white font-medium">{account.name}</p>
                                    <p className="text-slate-500 text-sm">{account.country}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${account.status === 'Growth'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : account.status === 'Risk'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-slate-700 text-slate-300'
                                    }`}>
                                    {account.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
