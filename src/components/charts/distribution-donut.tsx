'use client'

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts'

interface DistributionDonutProps {
    data: Array<{
        name: string
        value: number
        color: string
    }>
    title?: string
    centerLabel?: string
    centerValue?: string | number
    layout?: 'horizontal' | 'vertical'
}


const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-lg">
                <p className="text-white text-sm font-medium">{data.name}</p>
                <p className="text-slate-400 text-sm">
                    ${data.value.toLocaleString()} ({data.payload.percentage?.toFixed(1)}%)
                </p>
            </div>
        )
    }
    return null
}

export function DistributionDonut({
    data,
    title,
    centerLabel,
    centerValue,
    layout = 'horizontal'
}: DistributionDonutProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    const dataWithPercentage = data.map(item => ({
        ...item,
        percentage: total > 0 ? (item.value / total) * 100 : 0,
    }))

    return (
        <div className={`backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-full flex flex-col`}>
            {title && (
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            )}

            <div className={`flex flex-1 ${layout === 'vertical' ? 'flex-col items-center justify-center' : 'items-center'} gap-6 min-h-0`}>
                {/* Donut Chart */}
                <div className="relative h-48 w-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dataWithPercentage}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {dataWithPercentage.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label */}
                    {(centerLabel || centerValue) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {centerValue && (
                                <p className="text-2xl font-bold text-white">{centerValue}</p>
                            )}
                            {centerLabel && (
                                <p className="text-sm text-slate-400">{centerLabel}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {dataWithPercentage.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm text-slate-300">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium text-white">
                                {item.percentage.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
