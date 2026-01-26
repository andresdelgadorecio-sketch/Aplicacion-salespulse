
'use client'

import React from 'react'
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    TooltipProps
} from 'recharts'

export interface MonthlyData {
    mes: string
    Colombia: number
    Ecuador: number
    Peru: number
    Goal: number
}

interface ExecutiveActionChartProps {
    data: MonthlyData[]
}

export function ExecutiveActionChart({ data }: ExecutiveActionChartProps) {

    // Format large numbers for axis
    const formatYAxis = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
        return `$${value}`
    }

    // Format currency for tooltip
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value)
    }

    const [view, setView] = React.useState<'Global' | 'Colombia' | 'Ecuador' | 'Peru'>('Global')

    const getGoalFactor = (v: typeof view) => {
        switch (v) {
            case 'Colombia': return 0.60
            case 'Peru': return 0.30
            case 'Ecuador': return 0.10
            default: return 1.0
        }
    }

    // Process data based on view
    const chartData = data.map(d => ({
        ...d,
        Goal: d.Goal * getGoalFactor(view)
    }))

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const goal = payload.find((p: any) => p.dataKey === 'Goal')?.value || 0

            let totalSales = 0

            if (view === 'Global') {
                const colombia = payload.find((p: any) => p.dataKey === 'Colombia')?.value || 0
                const ecuador = payload.find((p: any) => p.dataKey === 'Ecuador')?.value || 0
                const peru = payload.find((p: any) => p.dataKey === 'Peru')?.value || 0
                totalSales = (colombia as number) + (ecuador as number) + (peru as number)
            } else {
                // For specific country view, the single bar value is the total
                const countryData = payload.find((p: any) => p.dataKey === view)
                totalSales = countryData ? countryData.value : 0
            }

            const variance = totalSales - (goal as number)
            const variancePct = goal > 0 ? (variance / (goal as number)) * 100 : 0
            const isAtRisk = totalSales < (goal as number)

            return (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[200px]">
                    <p className="text-slate-300 font-bold mb-2 border-b border-slate-700 pb-1">{label} - {view}</p>

                    {/* Breakdown */}
                    <div className="space-y-1 mb-3">
                        {payload.filter((p: any) => p.dataKey !== 'Goal').map((p: any) => (
                            <div key={p.dataKey} className="flex justify-between items-center text-xs">
                                <span style={{ color: p.color }}>{p.dataKey}:</span>
                                <span className="text-slate-200 font-mono">{formatCurrency(p.value)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="pt-2 border-t border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">Total Sales:</span>
                            <span className="text-sm font-bold text-white">{formatCurrency(totalSales)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400">Goal ({view === 'Global' ? '100%' : `${(getGoalFactor(view) * 100).toFixed(0)}%`}):</span>
                            <span className="text-xs font-mono text-white">{formatCurrency(goal as number)}</span>
                        </div>

                        {/* Decision Indicator */}
                        <div className={`mt-2 p-2 rounded-lg text-center border ${isAtRisk ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <span className={`block text-xs font-extrabold uppercase tracking-wider ${isAtRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isAtRisk ? 'En Riesgo' : 'Superado'}
                            </span>
                            <span className={`text-[10px] font-bold ${variance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {variance > 0 ? '+' : ''}{variancePct.toFixed(1)}% ({formatCurrency(variance)})
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className="bg-slate-950/50 backdrop-blur rounded-2xl p-6 border border-slate-800 w-full h-[450px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-sky-500 to-violet-500 rounded-full"></span>
                    Performance Ejecutivo por País
                </h3>

                {/* View Selector */}
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    {['Global', 'Colombia', 'Ecuador', 'Peru'].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v as any)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === v
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 30,
                        bottom: 20,
                        left: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tickFormatter={formatYAxis}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                    />

                    {/* Conditional Bars based on View */}
                    {(view === 'Global' || view === 'Colombia') && (
                        <Bar
                            dataKey="Colombia"
                            stackId="sales"
                            fill="#0ea5e9"
                            barSize={32}
                            radius={view === 'Colombia' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                    )}
                    {(view === 'Global' || view === 'Ecuador') && (
                        <Bar
                            dataKey="Ecuador"
                            stackId="sales"
                            fill="#8b5cf6"
                            barSize={32}
                            radius={view === 'Ecuador' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                    )}
                    {(view === 'Global' || view === 'Peru') && (
                        <Bar
                            dataKey="Peru"
                            stackId="sales"
                            fill="#10b981"
                            barSize={32}
                            radius={[4, 4, 0, 0]}
                        />
                    )}

                    {/* Goal Line */}
                    <Line
                        type="monotone"
                        dataKey="Goal"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}
