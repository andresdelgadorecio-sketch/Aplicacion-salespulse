'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Opportunity, AOPTarget } from '@/lib/types'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    LayoutDashboard,
    AlertTriangle,
    TrendingUp,
    Calendar,
    DollarSign,
    Target,
    BarChart3
} from 'lucide-react'
import { generateWeeklyPlan } from '@/lib/logic/advanced-risk-engine'
import { ForecastMatrixTable } from '@/components/forecast/ForecastMatrixTable'
import { ExecutiveActionChart, MonthlyData } from '@/components/forecast/ExecutiveActionChart'
import { CountryDistributionChart } from '@/components/forecast/CountryDistributionChart'

export default function OpportunitiesDashboard() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([])
    const [aopTargets, setAopTargets] = useState<AOPTarget[]>([])
    const [weeklyPlan, setWeeklyPlan] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            // Fetch Opportunities
            const { data: opps } = await supabase.from('opportunities').select('*')

            // Fetch AOP Targets
            const { data: aops } = await supabase.from('aop_targets').select('*')

            setOpportunities(opps as Opportunity[] || [])
            setAopTargets(aops as AOPTarget[] || [])

            if (opps) {
                const plan = generateWeeklyPlan(opps as Opportunity[])
                setWeeklyPlan(plan)
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    // --- KPI Calculations ---
    const totalPipeline = opportunities.reduce((sum, opp) => sum + opp.amount, 0)
    const weightedForecast = opportunities.reduce((sum, opp) => sum + (opp.weighted_amount || 0), 0)

    // Risk Volume: Sum of amounts of opportunities with alerts
    const riskVolume = opportunities.reduce((sum, opp) => {
        return (opp.alerts && opp.alerts.length > 0) ? sum + opp.amount : sum
    }, 0)

    // Gap Analysis (Global for simplicity, can be filtered by month later)
    // We'll calculate current month gap
    const currentMonth = new Date().toISOString().substring(0, 7)
    const currentAop = aopTargets.filter(t => t.month_period === currentMonth)
        .reduce((sum, t) => sum + t.target_amount, 0)

    // Forecast for current month (Close Date in this month)
    const currentMonthForecast = opportunities
        .filter(o => o.close_date.startsWith(currentMonth) && o.status === 'Active')
        .reduce((sum, o) => sum + (o.weighted_amount || 0), 0)

    const gap = currentMonthForecast - currentAop
    const coverage = gap < 0 ? (totalPipeline / Math.abs(gap)) : 100 // Simplistic coverage metric

    // --- Matrix Data Processing ---
    // Force full year 2026
    const sortedMonths = [
        '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
        '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
    ]

    // AOP Integration: Aggregate targets by month (YYYY-MM)
    // AOP Integration: Aggregate targets by month (YYYY-MM)
    const aopMonthlyTotals: Record<string, number> = {}

    // First pass: Index all available data
    const rawAopMap: Record<string, number> = {}
    aopTargets.forEach(t => {
        if (t.month_period) {
            const m = t.month_period.substring(0, 7)
            rawAopMap[m] = (rawAopMap[m] || 0) + (t.target_amount || 0)
        }
    })

    // Second pass: Populate aopMonthlyTotals, filling 2026 with 2025 data if needed
    sortedMonths.forEach(targetMonthKey => {
        // targetMonthKey is like '2026-01'
        let val = rawAopMap[targetMonthKey]

        // If no data for 2026, try 2025
        if (!val && targetMonthKey.startsWith('2026')) {
            const monthSuffix = targetMonthKey.substring(5) // '01'
            const sourceKey2025 = `2025-${monthSuffix}`
            val = rawAopMap[sourceKey2025]
        }

        if (val) {
            aopMonthlyTotals[targetMonthKey] = val
        }
    })

    // We still collect used countries dyanmically, or we could fix them too if needed. 
    // For now dynamic countries is better.
    const allCountries = new Set<string>()
    const weightedMatrix: Record<string, Record<string, number>> = {}
    const grossMatrix: Record<string, Record<string, number>> = {}

    opportunities.forEach(opp => {
        const dateRaw = opp.close_date
        // Ensure YYYY-MM
        const month = dateRaw.substring(0, 7)
        const country = opp.country || 'Otro'

        // Only process if it falls within our range (or we could add it dynamically if outside 2026?)
        // User asked for Jan-Dec 2026 implicitly by context, but if data is 2025 or 2027 it might be hidden?
        // Let's stick to showing whatever data matches the months we defined, plus add valid countries.
        if (month.startsWith('2026')) {
            allCountries.add(country)

            if (!weightedMatrix[month]) weightedMatrix[month] = {}
            if (!grossMatrix[month]) grossMatrix[month] = {}

            weightedMatrix[month][country] = (weightedMatrix[month][country] || 0) + (opp.weighted_amount || 0)
            grossMatrix[month][country] = (grossMatrix[month][country] || 0) + (opp.amount || 0)
        }
    })

    const sortedCountries = Array.from(allCountries).sort()

    // --- Executive Chart Data Preparation ---
    const executiveChartData: MonthlyData[] = sortedMonths.map(month => {
        const row = weightedMatrix[month] || {}
        const goal = aopMonthlyTotals[month] || 0

        return {
            mes: month,
            Colombia: row['COLOMBIA'] || 0,
            Ecuador: row['ECUADOR'] || 0,
            Peru: row['PERU'] || 0,
            Goal: goal
        }
    })

    // --- Country Distribution Data ---
    const totalByCountry: Record<string, number> = {}
    sortedCountries.forEach(c => totalByCountry[c] = 0)

    // Sum weighted amounts per country across all months
    sortedMonths.forEach(m => {
        const row = weightedMatrix[m] || {}
        sortedCountries.forEach(c => {
            totalByCountry[c] += (row[c] || 0)
        })
    })

    if (loading) return <div className="p-8 text-white">Cargando dashboard...</div>

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <LayoutDashboard className="h-8 w-8 text-indigo-400" />
                    Tablero de Control de Oportunidades
                </h1>
                <p className="text-slate-400 mt-1">
                    Análisis avanzado de forecast, riesgos y plan de acción semanal
                </p>
            </div>

            {/* A. KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Total Pipeline (Bruto)"
                    value={`$${totalPipeline.toLocaleString()}`}
                    icon={DollarSign}
                    color="text-blue-400"
                />
                <KPICard
                    title="Forecast Ponderado"
                    value={`$${weightedForecast.toLocaleString()}`}
                    icon={TrendingUp}
                    color="text-emerald-400"
                    subtitle="Realista basado en Win% x Go%"
                />
                <KPICard
                    title="Volumen en Riesgo"
                    value={`$${riskVolume.toLocaleString()}`}
                    icon={AlertTriangle}
                    color="text-amber-400"
                    subtitle="Oportunidades con alertas activas"
                />
                <KPICard
                    title="GAP Mensual (Vs AOP)"
                    value={`$${gap.toLocaleString()}`}
                    icon={Target}
                    color={gap >= 0 ? "text-emerald-400" : "text-red-400"}
                    subtitle={`Meta: $${currentAop.toLocaleString()}`}
                />
            </div>

            {/* B. Executive Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ExecutiveActionChart data={executiveChartData} />
                </div>
                <div className="lg:col-span-1">
                    <CountryDistributionChart data={totalByCountry} />
                </div>
            </div>

            {/* D. Tablero de Riesgos y Plan Semanal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Plan Board */}
                <div className="lg:col-span-2 backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-400" />
                        Plan de Acción Semanal
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                            <DayColumn
                                key={day}
                                dayName={day}
                                plan={weeklyPlan?.[day]}
                            />
                        ))}
                    </div>
                </div>

                {/* Risk Alerts List */}
                <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        Alertas Críticas
                    </h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {opportunities
                            .filter(o => o.alerts && o.alerts.length > 0)
                            .map(opp => (
                                <div key={opp.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-white font-medium truncate w-3/4" title={opp.name}>{opp.name}</h4>
                                        <span className="text-xs text-slate-400">{format(parseISO(opp.close_date), 'MMM yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-emerald-400 font-semibold">${opp.amount.toLocaleString()}</span>
                                        <span className="text-slate-400 text-sm">{Math.round(opp.probability)}% Prob</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {opp.alerts?.map(alert => (
                                            <span key={alert} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                {alert.replace('LARGE_LOW_PROB', 'Review: Low Prob').replace('COMMITTED_NO_PO', 'NO PO')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                        {opportunities.every(o => !o.alerts || o.alerts.length === 0) && (
                            <p className="text-slate-500 text-sm text-center py-8">No hay alertas críticas detectadas.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* C. Matrices de Distribución Mensual */}
            <div className="space-y-8">
                <ForecastMatrixTable
                    title="Forecast Ponderado (Realista)"
                    variant="weighted"
                    data={weightedMatrix}
                    months={sortedMonths}
                    countries={sortedCountries}
                    aopMonthlyTotals={aopMonthlyTotals}
                />
                <ForecastMatrixTable
                    title="Pipeline Total (Bruto)"
                    variant="gross"
                    data={grossMatrix}
                    months={sortedMonths}
                    countries={sortedCountries}
                />
            </div>


        </div>
    )
}

function KPICard({ title, value, icon: Icon, color, subtitle }: any) {
    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
                    <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
                    {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-slate-800/50 ${color}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    )
}

function DayColumn({ dayName, plan }: any) {
    const days: Record<string, string> = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes' }

    return (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 flex flex-col h-full">
            <h4 className="text-slate-300 font-semibold mb-3 border-b border-slate-700 pb-2">{days[dayName]}</h4>

            {plan ? (
                <div className="space-y-3 flex-1">
                    {plan.country && (
                        <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                            <span className="text-[10px] text-indigo-300 uppercase font-bold block mb-1">Foco País</span>
                            <p className="text-white font-medium text-sm">{plan.country}</p>
                            <p className="text-indigo-200 text-xs">{plan.focus}</p>
                        </div>
                    )}

                    {plan.items && plan.items.length > 0 && (
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">{plan.focus}</span>
                            <div className="space-y-2">
                                {plan.items.slice(0, 3).map((item: any) => (
                                    <div key={item.id} className="text-xs p-2 bg-slate-900/50 rounded border border-slate-800">
                                        <p className="text-white truncate" title={item.name}>{item.name}</p>
                                        <p className="text-emerald-400 font-medium">${(item.amount / 1000).toFixed(0)}k</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-slate-600 text-xs italic text-center my-auto">Sin asignación</p>
            )}
        </div>
    )
}
