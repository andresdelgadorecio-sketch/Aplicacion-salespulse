'use client'

import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

interface RevenueBarChartProps {
    data: Array<{
        period: string
        actual: number | null
        target: number
        projected?: number | null
    }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="backdrop-blur-xl bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl">
                <p className="text-slate-200 font-medium mb-3">{label}</p>
                {payload.map((item: any, index: number) => {
                    // Solo mostrar si tiene valor (no null)
                    if (item.value === null || item.value === undefined) return null

                    return (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <p className="text-sm text-slate-300">
                                {item.name}: <span className="font-mono text-white">${item.value.toLocaleString()}</span>
                            </p>
                        </div>
                    )
                })}
            </div>
        )
    }
    return null
}

export function RevenueBarChart({ data }: RevenueBarChartProps) {
    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-bold text-white">Proyección 2026 vs AOP</h3>
                    <p className="text-sm text-slate-400">Comparativa de Ventas Reales, Proyección y Metas AOP.</p>
                </div>
            </div>

            <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="period"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />

                        {/* Meta AOP (Línea Roja) */}
                        <Line
                            type="monotone"
                            dataKey="target"
                            name="Meta AOP"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />

                        {/* Proyección (Línea Punteada Azul) */}
                        <Line
                            type="monotone"
                            dataKey="projected"
                            name="Proyección (Tendencia)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            connectNulls
                        />

                        {/* Ventas Reales (Área Azul Solida) */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            name="Ventas Reales"
                            stroke="#3b82f6"
                            fill="url(#colorActual)"
                            strokeWidth={3}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
