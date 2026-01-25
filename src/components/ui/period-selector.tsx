'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PeriodOption {
    value: string
    label: string
    startDate: string
    endDate: string
}

const periodOptions: PeriodOption[] = [
    { value: 'year-2025', label: '📅 Año Completo 2025', startDate: '2025-01-01', endDate: '2025-12-31' },
    { value: 'h1-2025', label: 'H1 2025 (Ene-Jun)', startDate: '2025-01-01', endDate: '2025-06-30' },
    { value: 'h2-2025', label: 'H2 2025 (Jul-Dic)', startDate: '2025-07-01', endDate: '2025-12-31' },
    { value: 'q1-2025', label: 'Q1 2025', startDate: '2025-01-01', endDate: '2025-03-31' },
    { value: 'q2-2025', label: 'Q2 2025', startDate: '2025-04-01', endDate: '2025-06-30' },
    { value: 'q3-2025', label: 'Q3 2025', startDate: '2025-07-01', endDate: '2025-09-30' },
    { value: 'q4-2025', label: 'Q4 2025', startDate: '2025-10-01', endDate: '2025-12-31' },
    { value: 'year-2026', label: '📅 Año Completo 2026', startDate: '2026-01-01', endDate: '2026-12-31' },
    { value: 'q1-2026', label: 'Q1 2026', startDate: '2026-01-01', endDate: '2026-03-31' },
    { value: 'h1-2026', label: 'H1 2026 (Ene-Jun)', startDate: '2026-01-01', endDate: '2026-06-30' },
    { value: 'ytd', label: '📊 Año hasta hoy', startDate: '2025-01-01', endDate: new Date().toISOString().split('T')[0] },
]

interface PeriodSelectorProps {
    onPeriodChange?: (startDate: string, endDate: string) => void
    defaultValue?: string
}

export function PeriodSelector({ onPeriodChange, defaultValue = 'year-2025' }: PeriodSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selected, setSelected] = useState(periodOptions.find(p => p.value === defaultValue) || periodOptions[0])

    const handleSelect = (option: PeriodOption) => {
        setSelected(option)
        setIsOpen(false)
        onPeriodChange?.(option.startDate, option.endDate)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="backdrop-blur-xl bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors"
            >
                <span className="text-sm text-slate-300">{selected.label}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 z-20 w-56 backdrop-blur-xl bg-slate-800/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                        <div className="max-h-64 overflow-y-auto py-1">
                            {periodOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selected.value === option.value
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'text-slate-300 hover:bg-slate-700/50'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
