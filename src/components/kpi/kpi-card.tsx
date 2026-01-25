'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
    title: string
    value: string | number
    subtitle?: string
    icon?: ReactNode
    trend?: {
        value: number
        label: string
    }
    variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function KPICard({
    title,
    value,
    subtitle,
    icon,
    trend,
    variant = 'default',
}: KPICardProps) {
    const variantStyles = {
        default: 'from-slate-800 to-slate-900 border-slate-700',
        success: 'from-emerald-900/30 to-slate-900 border-emerald-800/50',
        warning: 'from-amber-900/30 to-slate-900 border-amber-800/50',
        danger: 'from-red-900/30 to-slate-900 border-red-800/50',
    }

    const getTrendIcon = () => {
        if (!trend) return null
        if (trend.value > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />
        if (trend.value < 0) return <TrendingDown className="h-4 w-4 text-red-400" />
        return <Minus className="h-4 w-4 text-slate-400" />
    }

    const getTrendColor = () => {
        if (!trend) return ''
        if (trend.value > 0) return 'text-emerald-400'
        if (trend.value < 0) return 'text-red-400'
        return 'text-slate-400'
    }

    return (
        <div
            className={`relative overflow-hidden backdrop-blur-xl bg-gradient-to-br ${variantStyles[variant]} border rounded-2xl p-6 shadow-lg`}
        >
            {/* Icon */}
            {icon && (
                <div className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
                    {icon}
                </div>
            )}

            {/* Title */}
            <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>

            {/* Value */}
            <p className="text-3xl font-bold text-white mb-1">{value}</p>

            {/* Subtitle / Trend */}
            <div className="flex items-center gap-2">
                {trend && (
                    <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                        {getTrendIcon()}
                        <span className="text-sm font-medium">
                            {trend.value > 0 ? '+' : ''}{trend.value}%
                        </span>
                    </div>
                )}
                {subtitle && (
                    <span className="text-slate-500 text-sm">{subtitle}</span>
                )}
            </div>
        </div>
    )
}
