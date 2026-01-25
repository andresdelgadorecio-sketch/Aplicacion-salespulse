import { Opportunity, AtRiskOpportunity, RiskTag, AOPTarget } from '@/lib/types'

const HIGH_VALUE_THRESHOLD = 25000
const LOW_PROBABILITY_THRESHOLD = 50
const CONCENTRATION_THRESHOLD = 0.6 // 60% de la meta mensual
const STALLED_DAYS_THRESHOLD = 30

/**
 * Detecta si una oportunidad tiene alto valor y baja probabilidad
 */
function isHighValueLowProb(opp: Opportunity): boolean {
    return opp.total_amount > HIGH_VALUE_THRESHOLD && opp.probability < LOW_PROBABILITY_THRESHOLD
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

    return opp.total_amount > target.target_amount * CONCENTRATION_THRESHOLD
}

/**
 * Detecta si una oportunidad está estancada (sin cambios en > 30 días)
 */
function isStalled(opp: Opportunity): boolean {
    const createdDate = new Date(opp.created_at)
    const daysSinceCreation = Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Si no hay campo de "última actualización", usamos la fecha de creación
    return daysSinceCreation > STALLED_DAYS_THRESHOLD
}

/**
 * Calcula el puntaje de riesgo de una oportunidad (0-100)
 */
function calculateRiskScore(risks: RiskTag[], opp: Opportunity): number {
    let score = 0

    if (risks.includes('High Value / Low Prob')) {
        score += 40
    }
    if (risks.includes('Concentration')) {
        score += 35
    }
    if (risks.includes('Stalled')) {
        score += 25
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
    const riskReasons: RiskTag[] = []

    if (isHighValueLowProb(opp)) {
        riskReasons.push('High Value / Low Prob')
    }

    if (isConcentration(opp, targets, countryForAccount)) {
        riskReasons.push('Concentration')
    }

    if (isStalled(opp)) {
        riskReasons.push('Stalled')
    }

    return {
        ...opp,
        riskScore: calculateRiskScore(riskReasons, opp),
        riskReasons,
    }
}

/**
 * Obtiene todas las oportunidades en riesgo, ordenadas por puntaje
 */
export function getAtRiskOpportunities(
    opportunities: Opportunity[],
    targets: AOPTarget[] = [],
    accountCountryMap: Record<string, string> = {}
): AtRiskOpportunity[] {
    const assessed = opportunities
        .filter(opp => opp.status === 'Active')
        .map(opp => assessOpportunityRisk(opp, targets, accountCountryMap[opp.account_id]))
        .filter(opp => opp.riskReasons.length > 0)
        .sort((a, b) => b.riskScore - a.riskScore)

    return assessed
}

/**
 * Agrupa oportunidades en riesgo por tipo de riesgo
 */
export function groupByRiskType(
    atRiskOpportunities: AtRiskOpportunity[]
): Record<RiskTag, AtRiskOpportunity[]> {
    const grouped: Record<RiskTag, AtRiskOpportunity[]> = {
        'High Value / Low Prob': [],
        'Concentration': [],
        'Stalled': [],
    }

    atRiskOpportunities.forEach(opp => {
        opp.riskReasons.forEach(reason => {
            grouped[reason].push(opp)
        })
    })

    return grouped
}

/**
 * Obtiene estadísticas de riesgo del pipeline
 */
export function getRiskStats(opportunities: Opportunity[]): {
    totalAtRisk: number
    highRiskAmount: number
    riskPercentage: number
} {
    const atRisk = getAtRiskOpportunities(opportunities)
    const totalActive = opportunities.filter(o => o.status === 'Active')

    const highRiskAmount = atRisk.reduce((sum, opp) => sum + opp.total_amount, 0)
    const totalAmount = totalActive.reduce((sum, opp) => sum + opp.total_amount, 0)

    return {
        totalAtRisk: atRisk.length,
        highRiskAmount,
        riskPercentage: totalAmount > 0 ? (highRiskAmount / totalAmount) * 100 : 0,
    }
}
