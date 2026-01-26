
'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface CountryDistributionChartProps {
    data: Record<string, number> // { Colombia: 1000, Peru: 500, ... }
}

const COLORS = {
    'COLOMBIA': '#0ea5e9', // Sky-500
    'ECUADOR': '#8b5cf6',  // Violet-500
    'PERU': '#10b981',     // Emerald-500
    'OTRO': '#64748b'      // Slate-500
}

export function CountryDistributionChart({ data }: CountryDistributionChartProps) {

    // Transform data for chart
    const total = Object.values(data).reduce((acc, val) => acc + val, 0)

    const chartData = Object.entries(data)
        .filter(([_, val]) => val > 0)
        .map(([name, value]) => ({
            name,
            value,
            color: COLORS[name as keyof typeof COLORS] || '#94a3b8',
            percent: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value) // Sort by value desc

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
        return `$${value}`
    }

    return (
        <div className="bg-slate-950/50 backdrop-blur rounded-2xl p-6 border border-slate-800 h-[450px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">Distribución por País</h3>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Donut Chart */}
                <div className="relative w-[200px] h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name]}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-extrabold text-white tracking-tight">
                            {formatCurrency(total)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-3 min-w-[140px]">
                    {chartData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                    {item.name}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-white">
                                {item.percent.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
