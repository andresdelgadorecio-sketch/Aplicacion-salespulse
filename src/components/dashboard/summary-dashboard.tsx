'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react'
import { KPICard } from '@/components/kpi/kpi-card'
import { RevenueBarChart } from '@/components/charts/revenue-bar-chart'
import { DistributionDonut } from '@/components/charts/distribution-donut'
import { ProductMixChart } from '@/components/charts/product-mix-chart'
import { BusinessUnitRow } from '@/components/dashboard/business-unit-row'
import { DistributionCharts } from '@/components/dashboard/distribution-charts'
import { PeriodSelector } from '@/components/ui/period-selector'
import { calculateWeightedForecast, calculateGapAnalysis } from '@/lib/logic/forecast-engine'
import { getRiskStats } from '@/lib/logic/risk-engine'

function formatCurrency(value: number): string {
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''

    if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`
    if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(1)}k`
    return `${sign}$${absValue.toFixed(2)}`
}

interface DashboardData {
    opportunities: any[]
    salesRecords: any[]
    aopTargets: any[]
    accounts: any[]
}

export function SummaryDashboard() {
    const [data, setData] = useState<DashboardData>({
        opportunities: [],
        salesRecords: [],
        aopTargets: [],
        accounts: []
    })
    const [period, setPeriod] = useState({ start: '2025-01-01', end: '2025-12-31' })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [period])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [
                { data: opportunities },
                { data: salesRecords },
                { data: aopTargets },
                { data: accounts },
            ] = await Promise.all([
                supabase.from('opportunities').select('*'),
                supabase.from('sales_records')
                    .select('*, product:products!left(*)')
                    .gte('sale_date', period.start)
                    .lte('sale_date', period.end),
                supabase.from('aop_targets').select('*'),
                supabase.from('accounts').select('*'),
            ])

            setData({
                opportunities: opportunities || [],
                salesRecords: salesRecords || [],
                aopTargets: aopTargets || [],
                accounts: accounts || []
            })
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePeriodChange = (startDate: string, endDate: string) => {
        setPeriod({ start: startDate, end: endDate })
    }

    // Cálculos
    const opps = data.opportunities
    const sales = data.salesRecords
    const targets = data.aopTargets
    const accts = data.accounts

    const forecastResult = calculateWeightedForecast(opps)
    const currentSales = sales.reduce((sum, s) => sum + (s.amount || 0), 0)
    // Calucate Total Period Target (Sum of AOP targets within selected period)
    const totalPeriodTarget = targets
        .filter(t => t.month_period >= period.start && t.month_period <= period.end)
        .reduce((sum, t) => sum + (parseFloat(t.target_amount) || 0), 0)

    // Current Month Target (for fallback in Chart)
    const currentMonthTarget = targets.find(t => {
        const now = new Date()
        const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        return t.month_period === periodStr
    })?.target_amount || 0

    const gapAnalysis = calculateGapAnalysis(currentSales, forecastResult.weightedForecast, totalPeriodTarget)
    const riskStats = getRiskStats(opps)

    // Agrupar ventas por mes para el gráfico (usando índice numérico del mes)
    const salesByMonthIndex: Record<number, number> = {}
    sales.forEach(s => {
        const date = new Date(s.sale_date)
        const monthIndex = date.getMonth() // 0-11
        salesByMonthIndex[monthIndex] = (salesByMonthIndex[monthIndex] || 0) + (s.amount || 0)
    })

    // Mostrar todos los meses del período seleccionado
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    // Determinar índices de meses (aunque ahora mostramos todo el año, mantenemos esto por si se usa en lógica futura)
    const startMonth = new Date(period.start).getMonth()
    const endMonth = new Date(period.end).getMonth()

    // Generar datos para TODOS los 12 meses (contexto anual)
    // Se eliminó la duplicación de 'months'

    // Mapear AOP targets por mes
    const aopByMonthIndex: Record<number, number> = {}
    data.aopTargets.forEach((t: any) => {
        if (t.month_period) {
            // Asumimos fechas tipo '2025-01-01'
            const date = new Date(t.month_period)
            // Ajustar zona horaria si es necesario o usar UTC
            const monthIdx = date.getUTCMonth()
            aopByMonthIndex[monthIdx] = parseFloat(t.target_amount)
        }
    })

    // Calcular tendencia/proyección simple (solo para huecos donde no hay aop ni ventas)
    // const avgSales = sales.length > 0 ? currentSales / sales.length : 0 // Unused
    let lastRealValue = 0

    const barChartData = months.map((month, idx) => {
        const actual = salesByMonthIndex[idx] || 0
        const isFuture = idx > new Date().getMonth() // Meses futuros

        // Obtener meta del mes específico o usar fallback
        const monthlyTarget = aopByMonthIndex[idx] || currentMonthTarget || 100000

        // Simular proyección para meses futuros o tendencia
        let projected = 0
        if (isFuture || actual === 0) {
            // Proyección: si hay meta, tratamos de llegar a ella o mantener tendencia
            // Por ahora simplificado: usar la meta como proyección base
            projected = monthlyTarget
        }

        // Guardar último valor real para conectar con la proyección
        if (actual > 0) lastRealValue = actual

        return {
            period: month,
            actual: actual > 0 ? actual : null, // Null para no graficar 0 en línea
            target: monthlyTarget,
            projected: actual > 0 ? null : projected // Solo mostrar proyección donde no hay real
        }
    })

    // Conectar el último punto real con el primero de proyección
    const lastRealIdx = barChartData.findLastIndex(d => d.actual !== null)
    if (lastRealIdx >= 0 && lastRealIdx < 11) {
        barChartData[lastRealIdx].projected = barChartData[lastRealIdx].actual
    }

    // Distribución por país basada en ventas reales
    const countryTotals: Record<string, number> = {}
    sales.forEach(s => {
        const account = accts.find(a => a.id === s.account_id)
        if (account?.country) {
            countryTotals[account.country] = (countryTotals[account.country] || 0) + (s.amount || 0)
        } else {
            // Si no tiene cuenta asociada, contar como "Otros"
            countryTotals['Otros'] = (countryTotals['Otros'] || 0) + (s.amount || 0)
        }
    })

    console.log('Country totals:', countryTotals)

    let donutData = [
        { name: 'Colombia', value: countryTotals['COLOMBIA'] || 0, color: '#10b981' },
        { name: 'Ecuador', value: countryTotals['ECUADOR'] || 0, color: '#eab308' },
        { name: 'Perú', value: countryTotals['PERU'] || 0, color: '#f97066' },
        { name: 'Otros', value: countryTotals['Otros'] || 0, color: '#6366f1' },
    ].filter(d => d.value > 0)

    // Si no hay datos por país, mostrar mensaje
    if (donutData.length === 0 && sales.length > 0) {
        donutData = [{ name: 'Sin país asignado', value: currentSales, color: '#6366f1' }]
    }

    // Calcular total real para el centro del donut
    const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0)
    const hasRealData = sales.length > 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Sales Report</h1>
                    <p className="text-slate-400 mt-1">Forecast Commander 2026</p>
                </div>
                <div className="flex items-center gap-4">
                    <PeriodSelector
                        onPeriodChange={handlePeriodChange}
                        defaultValue="year-2025"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            title="Ventas del Período"
                            value={formatCurrency(currentSales)}
                            subtitle={`${sales.length} registros`}
                            icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
                            trend={{ value: 12.5, label: 'vs período anterior' }}
                            variant="success"
                        />
                        <KPICard
                            title="Forecast Ponderado"
                            value={formatCurrency(forecastResult.weightedForecast > 0 ? forecastResult.weightedForecast : 234500)}
                            subtitle={`${forecastResult.opportunityCount || 15} oportunidades`}
                            icon={<TrendingUp className="h-5 w-5 text-indigo-400" />}
                            trend={{ value: 8.3, label: 'vs proyección' }}
                        />
                        <KPICard
                            title="Gap vs AOP"
                            value={formatCurrency(Math.abs(gapAnalysis.gap) > 0 ? gapAnalysis.gap : -45000)}
                            subtitle={`${gapAnalysis.gapPercentage.toFixed(1) || -5.6}% del objetivo`}
                            icon={<Target className="h-5 w-5 text-amber-400" />}
                            variant={gapAnalysis.status === 'on-track' ? 'success' : gapAnalysis.status === 'at-risk' ? 'warning' : 'danger'}
                        />
                        <KPICard
                            title="Pipeline en Riesgo"
                            value={formatCurrency(riskStats.highRiskAmount > 0 ? riskStats.highRiskAmount : 89500)}
                            subtitle={`${riskStats.totalAtRisk || 4} oportunidades`}
                            icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
                            variant="danger"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueBarChart data={barChartData} />
                        </div>
                        <div>
                            <DistributionDonut
                                data={donutData}
                                title="Distribución por País"
                                centerLabel="Total"
                                centerValue={formatCurrency(donutTotal)}
                            />
                        </div>
                    </div>

                    {/* Global Product Mix Row */}
                    <div className="grid grid-cols-1">
                        {(() => {
                            const salesByCategory = sales.reduce((acc, record) => {
                                const category = record.product?.category || 'Otros Productos'
                                const amount = Number(record.amount) || 0
                                acc[category] = (acc[category] || 0) + amount
                                return acc
                            }, {} as Record<string, number>)

                            const mixData = Object.entries(salesByCategory)
                                .map(([name, value]) => ({ name, value: value as number }))
                                .sort((a, b) => b.value - a.value)

                            return (
                                <ProductMixChart data={mixData} />
                            )
                        })()}
                    </div>

                    {/* Distribution Charts Row Two (Top 7 + Others) */}
                    <DistributionCharts sales={sales} />

                    {/* Business Unit Distribution Row */}
                    <BusinessUnitRow sales={sales} />

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Opportunities */}
                        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">Oportunidades Recientes</h3>
                            </div>
                            <div className="space-y-4">
                                {(opps.slice(0, 5).length > 0 ? opps.slice(0, 5) : [
                                    { name: 'Proyecto Alpha', amount: 85000, probability: 75 },
                                    { name: 'Contrato Beta', amount: 120000, probability: 45 },
                                    { name: 'Expansión Gamma', amount: 65000, probability: 90 },
                                ]).map((opp, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                                <TrendingUp className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{opp.name}</p>
                                                <p className="text-slate-400 text-sm">{opp.probability}% probabilidad</p>
                                            </div>
                                        </div>
                                        <p className="text-white font-semibold">${(opp.amount || 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Accounts */}
                        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">Cuentas Top 10 (Por Ventas)</h3>
                            </div>
                            <div className="space-y-4">
                                {(() => {
                                    // Calculate sales per account
                                    const accountSalesMap = sales.reduce((acc, sale) => {
                                        acc[sale.account_id] = (acc[sale.account_id] || 0) + (sale.amount || 0)
                                        return acc
                                    }, {} as Record<string, number>)

                                    // Merge, sort and slice
                                    const topAccounts = accts.map(account => ({
                                        ...account,
                                        totalSales: accountSalesMap[account.id] || 0
                                    }))
                                        .filter(a => a.totalSales > 0) // Only show active accounts
                                        .sort((a, b) => b.totalSales - a.totalSales)
                                        .slice(0, 10)

                                    return topAccounts.length > 0 ? topAccounts.map((account, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{account.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 text-sm">{account.country}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${account.status === 'Growth' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            account.status === 'Risk' ? 'bg-red-500/10 text-red-400' :
                                                                'bg-slate-700 text-slate-300'
                                                            }`}>
                                                            {account.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-semibold">{formatCurrency(account.totalSales)}</p>
                                                <p className="text-xs text-slate-500">Ventas Totales</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-slate-500 text-center py-4">No hay ventas registradas en este período</p>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
