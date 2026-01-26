'use client'

import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'

interface ProductMixData {
    name: string
    value: number
    color?: string
}

interface ProductMixChartProps {
    data: ProductMixData[]
    title?: string
    subtitle?: string
}

export function ProductMixChart({
    data,
    title = "Global Product Mix",
    subtitle = "Revenue distribution by category"
}: ProductMixChartProps) {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0)
    const sortedData = [...data].sort((a, b) => b.value - a.value)

    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-full">
            <div className="flex items-center gap-3 mb-1">
                <Globe className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6 pl-8">{subtitle}</p>

            <div className="space-y-6">
                {sortedData.map((item, index) => {
                    const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
                    const relativePercentage = totalValue > 0 && sortedData[0].value > 0 ? (item.value / sortedData[0].value) * 100 : 0

                    // Gradients based on index to mix blues and purples
                    const gradients = [
                        'from-indigo-500 to-purple-500',
                        'from-blue-500 to-indigo-500',
                        'from-cyan-500 to-blue-500',
                        'from-slate-400 to-slate-500', // For smaller items
                        'from-slate-500 to-slate-600',
                    ]

                    const gradient = index < 3 ? gradients[index] : gradients[3]

                    return (
                        <div key={item.name} className="relative">
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className={`font-medium ${index < 3 ? 'text-white' : 'text-slate-300'}`}>
                                    {item.name}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-white">
                                        {(item.value / 1000).toFixed(0)}
                                    </span>
                                    <span className="text-xs text-slate-500 font-bold">kUSD</span>
                                </div>
                            </div>

                            {/* Bar Background */}
                            <div className="w-full h-3 bg-slate-800/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${relativePercentage}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                                    className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                                />
                            </div>
                        </div>
                    )
                })}

                {data.length === 0 && (
                    <div className="text-center py-10 text-slate-500 italic">
                        No hay datos de productos disponibles
                    </div>
                )}
            </div>
        </div>
    )
}
