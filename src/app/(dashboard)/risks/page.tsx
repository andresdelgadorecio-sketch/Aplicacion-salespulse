import { createClient } from '@/lib/supabase/server'
import { AlertTriangle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { getAtRiskOpportunities, groupByRiskType } from '@/lib/logic/risk-engine'

export const dynamic = 'force-dynamic'

export default async function RisksPage() {
    const supabase = await createClient()

    const [{ data: opportunities }, { data: aopTargets }, { data: accounts }] = await Promise.all([
        supabase.from('opportunities').select('*'),
        supabase.from('aop_targets').select('*'),
        supabase.from('accounts').select('*'),
    ])

    const opps = opportunities || []
    const targets = aopTargets || []
    const accts = accounts || []

    // Crear mapa de país por cuenta
    const accountCountryMap = accts.reduce((acc, account) => {
        acc[account.id] = account.country
        return acc
    }, {} as Record<string, string>)

    // Obtener oportunidades en riesgo
    const atRiskOpportunities = getAtRiskOpportunities(opps, targets, accountCountryMap)
    const groupedRisks = groupByRiskType(atRiskOpportunities)

    // Datos de ejemplo si no hay datos reales
    const exampleRisks = opps.length === 0 ? [
        { id: '1', name: 'Mega Proyecto TechCorp', amount: 150000, probability: 35, riskScore: 75, riskReasons: ['High Value / Low Prob'] },
        { id: '2', name: 'Contrato Único Nacional', amount: 280000, probability: 55, riskScore: 60, riskReasons: ['Concentration'] },
        { id: '3', name: 'Renovación Legacy', amount: 45000, probability: 70, riskScore: 45, riskReasons: ['Stalled'] },
        { id: '4', name: 'Expansión Regional', amount: 95000, probability: 40, riskScore: 55, riskReasons: ['High Value / Low Prob', 'Stalled'] },
    ] : atRiskOpportunities

    const getRiskIcon = (reason: string) => {
        switch (reason) {
            case 'High Value / Low Prob':
                return <DollarSign className="h-4 w-4" />
            case 'Concentration':
                return <AlertCircle className="h-4 w-4" />
            case 'Stalled':
                return <Clock className="h-4 w-4" />
            default:
                return <AlertTriangle className="h-4 w-4" />
        }
    }

    const getRiskColor = (score: number) => {
        if (score >= 70) return 'text-red-400 bg-red-500/20 border-red-500/30'
        if (score >= 50) return 'text-amber-400 bg-amber-500/20 border-amber-500/30'
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                    Alertas de Riesgo
                </h1>
                <p className="text-slate-400 mt-1">
                    Oportunidades que requieren atención inmediata
                </p>
            </div>

            {/* Risk Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="backdrop-blur-xl bg-red-900/20 border border-red-800/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="h-5 w-5 text-red-400" />
                        <h3 className="text-lg font-semibold text-white">Alto Valor / Baja Prob</h3>
                    </div>
                    <p className="text-3xl font-bold text-red-400">
                        {groupedRisks['High Value / Low Prob']?.length || 2}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">oportunidades</p>
                </div>

                <div className="backdrop-blur-xl bg-amber-900/20 border border-amber-800/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-white">Concentración</h3>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">
                        {groupedRisks['Concentration']?.length || 1}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">oportunidades</p>
                </div>

                <div className="backdrop-blur-xl bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-white">Estancadas</h3>
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">
                        {groupedRisks['Stalled']?.length || 2}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">oportunidades</p>
                </div>
            </div>

            {/* Risk List */}
            <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">
                    Todas las Oportunidades en Riesgo
                </h3>

                <div className="space-y-4">
                    {exampleRisks.map((opp: any) => (
                        <div
                            key={opp.id}
                            className={`p-5 rounded-xl border ${getRiskColor(opp.riskScore)} backdrop-blur-sm`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-white font-semibold text-lg">{opp.name}</h4>
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRiskColor(opp.riskScore)}`}>
                                            Score: {opp.riskScore}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        <span className="text-slate-300">
                                            <span className="text-slate-500">Monto:</span> ${opp.amount?.toLocaleString() || 0}
                                        </span>
                                        <span className="text-slate-300">
                                            <span className="text-slate-500">Probabilidad:</span> {opp.probability}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {opp.riskReasons?.map((reason: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs"
                                        >
                                            {getRiskIcon(reason)}
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
