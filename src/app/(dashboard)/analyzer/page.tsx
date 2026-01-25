'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Search, RefreshCw, Filter, ChevronDown, Check } from 'lucide-react'
import { RevenueBarChart } from '@/components/charts/revenue-bar-chart'
import { DistributionDonut } from '@/components/charts/distribution-donut'

type Country = 'ALL' | 'COLOMBIA' | 'ECUADOR' | 'PERU'

export default function AnalyzerPage() {
    const [selectedCountry, setSelectedCountry] = useState<Country>('ALL')
    const [opportunities, setOpportunities] = useState<any[]>([])
    const [accounts, setAccounts] = useState<any[]>([])
    const [salesRecords, setSalesRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Inspector State
    const [inspectorAccountId, setInspectorAccountId] = useState<string>('')
    const [inspectorTarget, setInspectorTarget] = useState<string>('')

    // Dropdown State
    const [searchTerm, setSearchTerm] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [oppsRes, acctsRes, salesRes] = await Promise.all([
                supabase.from('opportunities').select('*'),
                supabase.from('accounts').select('*'),
                supabase.from('sales_records').select('*'),
            ])
            setOpportunities(oppsRes.data || [])
            setAccounts(acctsRes.data || [])
            setSalesRecords(salesRes.data || [])
            setLoading(false)
        }
        fetchData()
    }, [])

    // Click outside handler for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Filter Logic
    const filteredAccounts = selectedCountry === 'ALL'
        ? accounts
        : accounts.filter(a => a.country === selectedCountry)

    const filteredAccountIds = new Set(filteredAccounts.map(a => a.id))
    const filteredOpportunities = opportunities.filter(o =>
        selectedCountry === 'ALL' || filteredAccountIds.has(o.account_id)
    )

    // Inspector Logic
    const selectedAccountData = inspectorAccountId
        ? accounts.find(a => a.id === inspectorAccountId)
        : null

    const accountSales = inspectorAccountId
        ? salesRecords.filter(s => s.account_id === inspectorAccountId)
        : []

    const accountTotalSales = accountSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const targetValue = parseFloat(inspectorTarget) || 0
    const progressPercent = targetValue > 0 ? (accountTotalSales / targetValue) * 100 : 0

    const inspectorChartData = Array.from({ length: 12 }, (_, i) => {
        const monthFilter = i
        const monthlyTotal = accountSales
            .filter(s => {
                // Parseo robusto de fecha: YYYY-MM-DD
                // Usamos split para evitar problemas de zona horaria con new Date()
                if (!s.sale_date) return false
                const parts = s.sale_date.toString().split('-')
                if (parts.length < 2) return false
                const month = parseInt(parts[1]) - 1 // 0-indexed
                return month === monthFilter
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

        // El usuario espera ver el valor ingresado en la línea roja, no dividido
        const monthlyTarget = targetValue > 0 ? targetValue : 0
        return {
            period: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
            actual: monthlyTotal,
            target: monthlyTarget
        }
    })

    // Dropdown Search Logic
    const filteredDropdownAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name))

    // General Charts Data (Mock - Demo)
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
        { name: 'Growth', value: filteredAccounts.filter(a => a.status === 'Growth').length || 0, color: '#10b981' },
        { name: 'Stable', value: filteredAccounts.filter(a => a.status === 'Stable').length || 0, color: '#6366f1' },
        { name: 'Risk', value: filteredAccounts.filter(a => a.status === 'Risk').length || 0, color: '#f97066' },
    ]

    const pipelineDistribution = [
        { name: 'Active', value: filteredOpportunities.filter(o => o.status === 'Active').length || 0, color: '#10b981' },
        { name: 'Closed Won', value: filteredOpportunities.filter(o => o.status === 'Closed Won').length || 0, color: '#6366f1' },
        { name: 'Closed Lost', value: filteredOpportunities.filter(o => o.status === 'Closed Lost').length || 0, color: '#f97066' },
    ]

    const countries = ['ALL', 'COLOMBIA', 'ECUADOR', 'PERU'] as const

    return (
        <div className="space-y-8">
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

            {/* Inspector */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative z-30">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Search className="h-6 w-6 text-indigo-400" />
                    Inspector de Desempeño
                </h2>

                <div className="flex flex-col md:flex-row gap-6 items-start relative z-50">
                    {/* Custom Dropdown */}
                    <div className="flex-1 w-full relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Seleccionar Cuenta
                        </label>
                        <div
                            className="flex items-center justify-between w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={inspectorAccountId ? 'text-white' : 'text-slate-500'}>
                                {inspectorAccountId
                                    ? accounts.find(a => a.id === inspectorAccountId)?.name
                                    : '-- Buscar cuenta --'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-700">
                                <div className="p-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                                    <div className="flex items-center bg-slate-800 rounded-lg px-3 py-2">
                                        <Search className="h-4 w-4 text-slate-400 mr-2" />
                                        <input
                                            autoFocus
                                            className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-slate-600"
                                            placeholder="Escribe para buscar..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-900">
                                    {filteredDropdownAccounts.length > 0 ? (
                                        filteredDropdownAccounts.map(acc => (
                                            <div
                                                key={acc.id}
                                                className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-300 hover:text-white flex items-center justify-between"
                                                onClick={() => {
                                                    setInspectorAccountId(acc.id)
                                                    setIsDropdownOpen(false)
                                                    setSearchTerm('')
                                                }}
                                            >
                                                <span>{acc.name}</span>
                                                {inspectorAccountId === acc.id && (
                                                    <Check className="h-4 w-4 text-indigo-400" />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-slate-500 text-sm text-center">
                                            No se encontraron cuentas
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meta Input */}
                    <div className="flex-1 w-full relative z-0">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Meta Anual ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                type="number"
                                placeholder="Ej. 50000"
                                value={inspectorTarget}
                                onChange={(e) => setInspectorTarget(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Results - Keep z-index normal */}
                {inspectorAccountId ? (
                    <div className="mt-8 pt-8 border-t border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500 relative z-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                                    <p className="text-slate-400 text-sm mb-2">Progreso vs Meta</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-4xl font-bold ${progressPercent >= 100 ? 'text-emerald-400' : progressPercent >= 80 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                            {progressPercent.toFixed(1)}%
                                        </span>
                                        <span className="text-slate-500 text-sm">completado</span>
                                    </div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-between text-sm">
                                        <div>
                                            <p className="text-slate-500">Ventas Reales</p>
                                            <p className="text-white font-medium">${accountTotalSales.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500">Meta</p>
                                            <p className="text-white font-medium">${targetValue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                                <h4 className="text-sm font-medium text-slate-300 mb-4 px-2">Desempeño Mensual - {selectedAccountData?.name}</h4>
                                <div className="h-[200px]">
                                    <RevenueBarChart data={inspectorChartData} minimal />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="mt-6 text-center text-slate-500 text-sm italic">
                        Selecciona una cuenta para ver detalles
                    </p>
                )}
            </div>

            <div className="border-t border-slate-800 my-8 relative z-0"></div>


            {/* Filters - Lower Z-Index */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative z-10">
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
                    <p className="text-3xl font-bold text-white">{filteredAccounts.length || 0}</p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Oportunidades</p>
                    <p className="text-3xl font-bold text-white">{filteredOpportunities.length}</p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Pipeline Total</p>
                    <p className="text-3xl font-bold text-white">
                        ${(filteredOpportunities.reduce((s, o) => s + (o.total_amount || 0), 0)).toLocaleString()}
                    </p>
                </div>
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Forecast Ponderado</p>
                    <p className="text-3xl font-bold text-white">
                        ${(filteredOpportunities.reduce((s, o) => s + ((o.total_amount * o.probability / 100) || 0), 0)).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Visión General</h3>
                    <RevenueBarChart data={barChartData} />
                </div>

                <DistributionDonut
                    data={statusDistribution}
                    title="Distribución por Estado de Cuenta"
                    centerLabel="Total"
                    centerValue={filteredAccounts.length || 0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionDonut
                    data={pipelineDistribution}
                    title="Estado del Pipeline"
                    centerLabel="Opps"
                    centerValue={filteredOpportunities.length || 0}
                />

                {/* Accounts List */}
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Cuentas {selectedCountry !== 'ALL' ? `en ${selectedCountry}` : ''}
                    </h3>

                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredAccounts.map((account, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
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
