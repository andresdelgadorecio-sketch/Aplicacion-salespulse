'use client'

import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, Layers } from 'lucide-react'

interface DistributionChartsProps {
    sales: any[]
}

export function DistributionCharts({ sales }: DistributionChartsProps) {
    // 1. Aggregate Sales by Category
    const salesByCategory = sales.reduce((acc, record) => {
        const category = record.product?.category || 'Sin Categoría'
        const amount = Number(record.amount) || 0
        acc[category] = (acc[category] || 0) + amount
        return acc
    }, {} as Record<string, number>)

    // 2. Sort Descending
    const sortedCategories = Object.entries(salesByCategory)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)

    // 3. Split into Top 6 and Others
    const top6 = sortedCategories.slice(0, 6)
    const others = sortedCategories.slice(6)

    const othersTotal = others.reduce((sum, item) => sum + item.value, 0)

    // Data for Left Chart (Top 7)
    const topDistributionData = [
        ...top6,
        { name: 'Otros (Agrupado)', value: othersTotal }
    ]

    // Data for Right Chart (Others Breakdown)
    const othersBreakdownData = others

    // Global Totals for percentages if needed
    const globalTotal = sortedCategories.reduce((sum, item) => sum + item.value, 0)

    // Color Palette
    const COLORS = [
        '#3b82f6', // Blue-500
        '#06b6d4', // Cyan-500
        '#8b5cf6', // Violet-500
        '#ec4899', // Pink-500
        '#10b981', // Emerald-500
        '#f59e0b', // Amber-500
        '#94a3b8', // Slate-400 (For Others)
        '#6366f1', // Indigo-500
        '#ef4444', // Red-500
        '#14b8a6', // Teal-500
    ]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DistributionCard
                title="Distribution (Top 7)"
                subtitle="Revenue share breakdown."
                data={topDistributionData}
                colors={COLORS}
                icon={TrendingUp}
                type="top"
            />
            <DistributionCard
                title="Others Breakdown"
                subtitle="Minor category details."
                data={othersBreakdownData}
                colors={COLORS.slice(6).concat(COLORS.slice(0, 6))} // Rotate colors for variety
                icon={Layers}
                type="others"
            />
        </div>
    )
}

// Sub-component for individual card
function DistributionCard({ title, subtitle, data, colors, icon: Icon, type }: any) {
    const [hoveredData, setHoveredData] = useState<any>(null)

    const total = data.reduce((sum: number, item: any) => sum + item.value, 0)
    const formatK = (val: number) => `$${(val / 1000).toFixed(0)}K`

    // Assign colors to data if not present (simple mapping)
    const chartData = data.map((item: any, index: number) => ({
        ...item,
        color: type === 'top' && item.name === 'Otros (Agrupado)'
            ? '#cbd5e1' // Special color for "Others" group in Top chart
            : colors[index % colors.length]
    }))

    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-400" />
                    <h3 className="text-white font-semibold text-lg">{title}</h3>
                </div>
                <div className="text-xs text-slate-500">Global</div>
            </div>
            <p className="text-sm text-slate-400 mb-6">{subtitle}</p>

            <div className="flex flex-col md:grid md:grid-cols-[40%_60%] gap-6 md:gap-4 items-center h-full">
                {/* Chart Area */}
                <div
                    className="relative h-48 w-full"
                    onMouseLeave={() => setHoveredData(null)}
                >
                    {/* Fixed Tooltip - Bottom Right of Container (Absolute to Card) */}
                    {hoveredData && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none w-full flex justify-center">
                            {/* In this design, let's put it in the center or floating? 
                                User liked "Fixed Bottom Right" for the previous one. 
                                Or distinct center value. 
                                Let's stick to the center label for Total, and hover tooltip maybe absolute elsewhere or use the same strategy.
                            */}
                        </div>
                    )}

                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <span className="text-white font-bold text-2xl drop-shadow-md tracking-tight">
                            {formatK(total)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Total Sales
                        </span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                onMouseEnter={(_, index) => setHoveredData(chartData[index])}
                                onMouseLeave={() => setHoveredData(null)}
                            >
                                {chartData.map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        stroke="rgba(0,0,0,0)"
                                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend List */}
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {chartData.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs group/item">
                            <span
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-400 truncate flex-1 group-hover/item:text-slate-200 transition-colors" title={item.name}>
                                {item.name}
                            </span>
                            {/* Optional: Show % or Value in legend? Image checks show value not always visible in legend, 
                                but explicit hover tooltip is better. Let's rely on hover tooltip. 
                             */}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hover Tooltip - Floating or Fixed? 
                Let's use the same "Bottom Right" strategy or "Floating near mouse" if simple. 
                User explicitly asked for "Bottom Right" on the previous card. I'll apply "Bottom Right of Card" here too.
            */}
            {hoveredData && (
                <div className="absolute bottom-4 right-4 z-[60] pointer-events-none">
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl shadow-black min-w-[200px]">
                        <div className="flex flex-col gap-2">
                            <p className="text-slate-100 text-sm font-medium border-b border-slate-800 pb-2 leading-snug">
                                {hoveredData.name}
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full ring-2 ring-slate-800" style={{ backgroundColor: hoveredData.color }} />
                                    <span className="text-xs text-slate-400">Ventas</span>
                                </div>
                                <p className="text-white font-bold text-base font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    ${(hoveredData.value / 1000).toFixed(1)}K
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
