'use client'

import React from 'react'
import { Video, Scan, ShieldCheck, Box, ChevronDown } from 'lucide-react'
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts'

interface BusinessUnitRowProps {
    sales: any[]
}

export function BusinessUnitRow({ sales }: BusinessUnitRowProps) {

    // Categorization Logic
    const units = {
        video: {
            title: 'Video Vigilancia',
            subtitle: 'Milestone, Hanwha y Honeywell',
            icon: Video,
            categories: ['Productos Hanwha', 'Camaras Honeywell', 'Producto Milestone'],
            colors: ['#3b82f6', '#06b6d4', '#8b5cf6'] // Blue, Cyan, Purple
        },
        readers: {
            title: 'Lectores',
            subtitle: 'BlueDiamond y Terceros',
            icon: Scan,
            categories: ['Lectoras de terceros', 'Reader BlueDiamond'],
            colors: ['#2563eb', '#10b981'] // Dark Blue, Emerald
        },
        onguard: {
            title: 'Ecosistema OnGuard',
            subtitle: 'Hardware, Software y Servicios',
            icon: ShieldCheck,
            categories: [
                'Controladores OnGuard',
                'Fuentes',
                'Software de OnGuard',
                'Soporte y actualizacion',
                'Licencia de integracion con terceros',
                'Entrenamiento',
                'Servicios de ingenieria',
                'Licencia de desarrollo para integrar',
                'Software BlueDiamond'
            ],
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#94a3b8']
        },
        netbox: {
            title: 'NetBox',
            subtitle: 'Sistemas S2 NetBox',
            icon: Box,
            categories: ['Hardware netbox o software netbox'],
            colors: ['#3b82f6'] // Blue
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BusinessUnitCard config={units.video} unitKey="video" sales={sales} />
            <BusinessUnitCard config={units.readers} unitKey="readers" sales={sales} />
            <BusinessUnitCard config={units.onguard} unitKey="onguard" sales={sales} />
            <BusinessUnitCard config={units.netbox} unitKey="netbox" sales={sales} />
        </div>
    )
}

function BusinessUnitCard({ config, unitKey, sales }: { config: any, unitKey: string, sales: any[] }) {
    const [hoveredData, setHoveredData] = React.useState<any>(null)
    const Icon = config.icon

    const processUnitData = () => {
        const filteredSales = sales.filter(s => {
            const cat = s.product?.category || ''
            return config.categories.includes(cat)
        })

        const total = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)

        const byCategory = filteredSales.reduce((acc: any, s: any) => {
            const cat = s.product?.category || 'Otros'
            acc[cat] = (acc[cat] || 0) + (Number(s.amount) || 0)
            return acc
        }, {} as Record<string, number>)

        const chartData = Object.entries(byCategory).map(([name, value], idx) => ({
            name,
            value: value as number,
            color: config.colors[idx % config.colors.length]
        })).sort((a: any, b: any) => b.value - a.value)

        return { total, chartData }
    }

    const { total, chartData } = processUnitData()
    const formatK = (val: number) => `$${(val / 1000).toFixed(0)}K`

    return (
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all min-h-[280px] flex flex-col justify-between">
            {/* Header */}
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${unitKey === 'onguard' ? 'text-emerald-400' : unitKey === 'netbox' ? 'text-orange-400' : 'text-blue-400'}`} />
                    <h3 className="text-white font-semibold">{config.title}</h3>
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-1 cursor-pointer hover:text-white transition-colors">
                    Global <ChevronDown className="h-3 w-3" />
                </div>
            </div>

            <p className="text-sm text-slate-400 mb-6 pl-7">{config.subtitle}</p>

            {/* Total Badge */}
            <div className="absolute top-16 right-6">
                <span className="bg-slate-800/50 px-3 py-1 rounded-lg text-slate-200 font-bold border border-slate-700/50">
                    {formatK(total)}
                </span>
            </div>

            {/* Content Grid */}
            <div className="flex flex-col md:grid md:grid-cols-[30%_70%] gap-6 md:gap-4 items-center mt-4 h-full min-h-[160px]">
                {/* Donut */}
                <div
                    className="relative h-48 md:h-32 w-full"
                    onMouseLeave={() => setHoveredData(null)}
                >
                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white font-bold text-sm drop-shadow-md">
                            {formatK(total)}
                        </span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={4}
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

                {/* Legend */}
                <div className="space-y-1.5 text-xs pl-2">
                    {chartData.slice(0, 9).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-400 truncate max-w-[150px] 2xl:max-w-[180px] leading-tight" title={item.name}>
                                {item.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manual Tooltip Layer - Bottom Right */}
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
