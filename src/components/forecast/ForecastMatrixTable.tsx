'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface MatrixData {
    [month: string]: Record<string, number>
}

interface MatrixProps {
    title: string
    data: MatrixData
    months: string[]
    countries: string[]
    variant: 'weighted' | 'gross'
    aopMonthlyTotals?: Record<string, number>
}

export function ForecastMatrixTable({ title, data, months, countries, variant, aopMonthlyTotals }: MatrixProps) {
    const isWeighted = variant === 'weighted'

    // Theme Configuration - Premium SaaS Dark Mode
    const theme = isWeighted ? {
        wrapper: 'bg-slate-950 border border-slate-800/50 shadow-2xl shadow-black/40',
        headerBg: 'bg-slate-950/80 backdrop-blur-xl',
        headerText: 'text-slate-400',
        primaryText: 'text-emerald-400',
        accentGradient: 'from-emerald-500/20 to-transparent',
        highlight: 'text-emerald-300',
        progressBar: 'bg-emerald-500',
        sparkline: '#10b981', // emerald-500
    } : {
        wrapper: 'bg-slate-950 border border-slate-800/50 shadow-2xl shadow-black/40',
        headerBg: 'bg-slate-950/80 backdrop-blur-xl',
        headerText: 'text-slate-400',
        primaryText: 'text-indigo-400',
        accentGradient: 'from-indigo-500/20 to-transparent',
        highlight: 'text-indigo-300',
        progressBar: 'bg-indigo-500',
        sparkline: '#6366f1', // indigo-500
    }

    // specific heatmap color logic
    const getHeatmapStyle = (intensity: number) => {
        if (!isWeighted) return {} // Gross matrix might use different style or plain
        // Subtle emerald gradient for weighted
        return {
            background: `linear-gradient(to bottom right, rgba(16, 185, 129, ${intensity * 0.15}), transparent)`,
            boxShadow: `inset 0 0 0 1px rgba(16, 185, 129, ${intensity * 0.05})`
        }
    }

    // Calculations
    const countryTotals: Record<string, number> = {}
    const countrySeries: Record<string, number[]> = {} // For sparklines
    let grandTotal = 0
    let maxValue = 0

    // Initialize country series
    countries.forEach(c => countrySeries[c] = [])

    // Process data
    months.forEach(m => {
        countries.forEach(c => {
            const val = data[m]?.[c] || 0
            if (val > maxValue) maxValue = val
            countrySeries[c].push(val)
        })
    })

    countries.forEach(c => {
        const sum = countrySeries[c].reduce((a, b) => a + b, 0)
        countryTotals[c] = sum
        grandTotal += sum
    })


    const fmt = (n: number) => {
        if (n === 0) return '-'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
        }).format(n)
    }

    const getTrend = (current: number, prev: number) => {
        if (prev === 0) return null
        const diff = current - prev
        const pct = (diff / prev) * 100
        return { diff, pct }
    }

    const getAopProgress = (total: number, aop: number) => {
        if (!aop || aop === 0) return null
        return (total / aop) * 100
    }

    // --- Sparkline Component (Micro-Chart) ---
    const Sparkline = ({ data, color }: { data: number[], color: string }) => {
        if (data.length < 2) return null
        const min = Math.min(...data)
        const max = Math.max(...data)
        const range = max - min || 1
        const width = 100
        const height = 24

        // Generate svg path points
        const step = width / (data.length - 1)
        const points = data.map((val, i) => {
            const x = i * step
            // Invert y (SVG 0 is top)
            const normalized = (val - min) / range
            const y = height - (normalized * height)
            return `${x},${y}`
        }).join(' ')

        return (
            <div className="h-6 w-24 opacity-70">
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Gradient Fill (Optional, keeping it clean line for now or sutil fill) */}
                    <path
                        d={`M 0,${height} L ${points} L ${width},${height} Z`}
                        fill={color}
                        fillOpacity="0.1"
                        stroke="none"
                    />
                    {/* Main Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        )
    }

    const getProgressConfig = (pct: number) => {
        if (pct > 100) return {
            bar: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]',
            text: 'text-emerald-400',
            badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            label: 'Exceeded'
        }
        if (pct >= 80) return {
            bar: 'bg-amber-400',
            text: 'text-amber-400',
            badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            label: 'On Track'
        }
        return {
            bar: 'bg-rose-500',
            text: 'text-rose-400',
            badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            label: 'At Risk'
        }
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl ${theme.wrapper} font-sans`}>
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-slate-800/60 bg-gradient-to-r from-slate-950 to-slate-900">
                <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`h-6 w-1 rounded-full ${isWeighted ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                        <h3 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest pl-3">Fiscal Year 2026</p>
                </div>

                {/* Total Annual Card */}
                <div className="flex justify-end">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-end min-w-[200px]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Annual Revenue</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-extrabold tracking-tight ${theme.primaryText}`}>
                                {fmt(grandTotal)}
                            </span>
                        </div>
                        {/* Simple growth indicator placeholder if needed */}
                        {/* <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                             <ArrowUpRight className="h-3 w-3" /> +12% vs LY
                         </span> */}
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/80">
                            {/* Period Header */}
                            <th className="px-6 py-5 text-left sticky left-0 z-20 bg-slate-950 min-w-[120px]">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Periodo</span>
                            </th>

                            {/* Country Headers with Sparklines */}
                            {countries.map(c => (
                                <th key={c} className="px-6 py-4 min-w-[180px] bg-slate-950/50">
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{c}</span>
                                        <Sparkline data={countrySeries[c]} color={theme.sparkline} />
                                    </div>
                                </th>
                            ))}

                            {/* Total Mes Header */}
                            <th className="px-6 py-5 min-w-[220px] bg-slate-900/50 border-l border-slate-800/50">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block pb-4">
                                    Performance Mensual
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {months.map((month, idx) => {
                            const row = data[month] || {}
                            const prevMonth = idx > 0 ? months[idx - 1] : null
                            const prevRow = prevMonth ? (data[prevMonth] || {}) : {}

                            const rowTotal = countries.reduce((sum, c) => sum + (row[c] || 0), 0)
                            const prevRowTotal = countries.reduce((sum, c) => sum + (prevRow[c] || 0), 0)
                            const rowTrend = getTrend(rowTotal, prevRowTotal)

                            const aop = aopMonthlyTotals ? aopMonthlyTotals[month] : 0
                            const aopProgress = getAopProgress(rowTotal, aop)

                            const status = aopProgress !== null ? getProgressConfig(aopProgress) : null

                            // Clean month display '2026-01' -> 'JAN 26' or just keep current
                            const dateObj = new Date(month + '-01') // simple parse
                            const monthLabel = month // Could format if needed

                            return (
                                <tr key={month} className="group hover:bg-slate-900/40 transition-colors">
                                    {/* Period Column */}
                                    <td className="px-6 py-5 text-left sticky left-0 z-10 bg-slate-950 border-r border-slate-800/50 group-hover:bg-slate-900 transition-colors">
                                        <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                                            {month}
                                        </span>
                                    </td>

                                    {/* Data Cells */}
                                    {countries.map(c => {
                                        const val = row[c] || 0
                                        const prevVal = prevRow[c] || 0
                                        const trend = getTrend(val, prevVal)

                                        const intensity = maxValue > 0 ? (val / maxValue) : 0

                                        return (
                                            <td key={c} className="px-6 py-5 relative group/cell">
                                                {/* Subtle Heatmap Background */}
                                                {(val > 0 && isWeighted) && (
                                                    <div
                                                        className="absolute inset-2 rounded-lg transition-all duration-500 opacity-80"
                                                        style={getHeatmapStyle(intensity)}
                                                    />
                                                )}

                                                <div className="relative z-10 flex flex-col items-end gap-1">
                                                    <span className={`font-medium text-sm tracking-tight ${val > 0 ? 'text-slate-200' : 'text-slate-600'}`}>
                                                        {fmt(val)}
                                                    </span>

                                                    {/* Micro Trend Indicator */}
                                                    {val > 0 && prevVal > 0 && trend && Math.abs(trend.pct) > 2 && (
                                                        <span className={`text-[9px] font-bold flex items-center ${trend.diff > 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                                            {trend.diff > 0 ? '+' : ''}{Math.abs(trend.pct) > 999 ? '>999' : Math.abs(trend.pct).toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })}

                                    {/* Detailed Total Mes Column */}
                                    <td className="px-6 py-4 border-l border-slate-800/50 bg-slate-900/20">
                                        <div className="flex flex-col gap-2">
                                            {/* Top Row: Amount & % Target */}
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-bold ${theme.primaryText}`}>
                                                    {fmt(rowTotal)}
                                                </span>
                                                {aopProgress !== null && status && (
                                                    <span className={`text-[10px] font-bold px-1.5 rounded border ${status.badge}`}>
                                                        {aopProgress >= 100 ? '✓ ' : ''}{aopProgress.toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>

                                            {/* Progress Bar & Target Context */}
                                            {aop > 0 && aopProgress !== null && status ? (
                                                <div className="w-full">
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                                                        {/* Target Marker (if > 100%) - Optional detail to show 'overachievement' visual could be added */}
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ease-out ${status.bar}`}
                                                            style={{ width: `${Math.min(aopProgress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-[9px] text-white font-bold">Goal: {fmt(aop)}</span>
                                                        <span className={`text-[9px] font-bold ${status.text}`}>{status.label}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-1.5 w-full bg-slate-800/30 rounded-full"></div> // Empty state
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-slate-950 border-t border-slate-800 relative z-20">
                        <tr>
                            <td className="px-6 py-4 text-left font-bold text-slate-400 text-xs tracking-widest sticky left-0 bg-slate-950">TOTAL</td>
                            {countries.map(c => (
                                <td key={c} className="px-6 py-4 font-bold text-sm text-slate-300">
                                    {fmt(countryTotals[c])}
                                </td>
                            ))}
                            <td className="px-6 py-4 font-extrabold text-sm text-white border-l border-slate-800">
                                {fmt(grandTotal)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                {months.length === 0 && (
                    <div className="p-12 text-center text-slate-500 font-light tracking-wide">
                        No data available for the selected period.
                    </div>
                )}
            </div>
        </div>
    )
}
