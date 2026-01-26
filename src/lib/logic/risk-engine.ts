import { Opportunity, AtRiskOpportunity, RiskTag, AOPTarget } from '@/lib/types'

const HIGH_VALUE_THRESHOLD = 25000
const LOW_PROBABILITY_THRESHOLD = 50
const CONCENTRATION_THRESHOLD = 0.6 // 60% de la meta mensual
const STALLED_DAYS_THRESHOLD = 30

/**
 * Detecta si una oportunidad tiene alto valor y baja probabilidad
 */
function isHighValueLowProb(opp: Opportunity): boolean {
    return opp.amount > HIGH_VALUE_THRESHOLD && opp.probability < LOW_PROBABILITY_THRESHOLD
}

/**
 * Detecta si una oportunidad representa concentración de riesgo
 * (oportunidad > 60% de la meta mensual del país)
 */
function isConcentration(
    opp: Opportunity,
    targets: AOPTarget[],
    countryForAccount?: string
): boolean {
    if (!countryForAccount) return false

    const closePeriod = opp.close_date.substring(0, 7)
    const target = targets.find(
        t => t.month_period === closePeriod && t.country === countryForAccount
    )

    if (!target || target.target_amount === 0) return false

    return opp.amount > target.target_amount * CONCENTRATION_THRESHOLD
}

/**
 * Calcula el puntaje de riesgo de una oportunidad (0-100)
 */
function calculateRiskScore(risks: string[], opp: Opportunity): number {
    let score = 0

    if (risks.includes('LARGE_LOW_PROB') || risks.includes('High Value / Low Prob')) {
        score += 40
    }
    if (risks.includes('PI_CONCENTRATION') || risks.includes('Concentration')) {
        score += 35
    }
    if (risks.includes('Stalled')) {
        score += 25
    }
    if (risks.includes('COMMITTED_NO_PO')) {
        score += 30
    }

    // Ajuste por probabilidad baja
    if (opp.probability < 30) {
        score += 10
    }

    return Math.min(score, 100)
}

/**
 * Evalúa los riesgos de una oportunidad
 */
export function assessOpportunityRisk(
    opp: Opportunity,
    targets: AOPTarget[] = [],
    countryForAccount?: string
): AtRiskOpportunity {
    // If we have pre-calculated alerts from import, use them
    const riskReasons: string[] = opp.alerts ? [...opp.alerts] : []

    // Runtime check for High Value / Low Prob
    if (isHighValueLowProb(opp) && !riskReasons.includes('High Value / Low Prob') && !riskReasons.includes('LARGE_LOW_PROB')) {
        riskReasons.push('High Value / Low Prob')
    }

    // Runtime check for Concentration
    if (isConcentration(opp, targets, countryForAccount)) {
        if (!riskReasons.includes('Concentration')) riskReasons.push('Concentration')
    }

    return {
        ...opp,
        riskScore: calculateRiskScore(riskReasons, opp),
        riskReasons: riskReasons as RiskTag[],
        alerts: riskReasons
    }
}

/**
 * Obtiene todas las oportunidades en riesgo
 */
export function getAtRiskOpportunities(
    opportunities: Opportunity[],
    targets: AOPTarget[],
    accountCountryMap: Record<string, string>
): AtRiskOpportunity[] {
    return opportunities
        .map(opp => assessOpportunityRisk(opp, targets, accountCountryMap[opp.account_id]))
        .filter(opp => opp.riskScore > 0 || (opp.riskReasons && opp.riskReasons.length > 0))
        .sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Agrupa las oportunidades por tipo de riesgo
 */
export function groupByRiskType(opportunities: AtRiskOpportunity[]): Record<string, AtRiskOpportunity[]> {
    const grouped: Record<string, AtRiskOpportunity[]> = {}

    opportunities.forEach(opp => {
        if (opp.riskReasons) {
            opp.riskReasons.forEach(reason => {
                // Normalize reason tags if needed, but keeping simple for now
                if (!grouped[reason]) {
                    grouped[reason] = []
                }
                grouped[reason].push(opp)
            })
        }
    })

    return grouped
}

export function getRiskStats(opportunities: Opportunity[]): {
    totalAtRisk: number
    highRiskAmount: number
    riskPercentage: number
} {
    const atRisk = opportunities.filter(o => o.alerts && o.alerts.length > 0)
    const totalActive = opportunities.filter(o => o.status === 'Active')

    const highRiskAmount = atRisk.reduce((sum, opp) => sum + opp.amount, 0)
    const totalAmount = totalActive.reduce((sum, opp) => sum + opp.amount, 0)

    return {
        totalAtRisk: atRisk.length,
        highRiskAmount,
        riskPercentage: totalAmount > 0 ? (highRiskAmount / totalAmount) * 100 : 0,
    }
}
