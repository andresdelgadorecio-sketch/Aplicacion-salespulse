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
    title?: string
    minimal?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
    // ... (Tooltip logic remains same, implicit in this replacement unless I include it)
    // To be safe, I will include the existing tooltip if I am replacing the whole block or just the props interface + component definition
    if (active && payload && payload.length) {
        return (
            <div className="backdrop-blur-xl bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl">
                <p className="text-slate-200 font-medium mb-3">{label}</p>
                {payload.map((item: any, index: number) => {
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

export function RevenueBarChart({ data, title, minimal = false }: RevenueBarChartProps) {
    const ChartContent = (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    {/* ... (Chart components) ... */}
                    {/* I need to make sure I don't lose the inner chart components. 
                        replace_file_content replaces the BLOCK. 
                        I should probably use TWO chunks if I want to keep the inner content, but the inner content is inside the component function.
                        Wait, I can just replace the FUNCTION definition line and the wrapping div logic.
                    */}
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

                    <Line
                        type="monotone"
                        dataKey="target"
                        name="Meta AOP"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                    />

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
    )

    if (minimal) {
        return ChartContent
    }

    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-bold text-white">{title || "Proyección 2026 vs AOP"}</h3>
                    {!title && <p className="text-sm text-slate-400">Comparativa de Ventas Reales, Proyección y Metas AOP.</p>}
                </div>
            </div>
            {ChartContent}
        </div>
    )
}
