import { Opportunity, AtRiskOpportunity, RiskTag } from '@/lib/types'

// Reglas de Negocio definidas en el prompt
const RULES = {
    LARGE_LOW_PROB: {
        amountThreshold: 25000,
        probThreshold: 50,
        tag: 'LARGE_LOW_PROB' as RiskTag
    },
    PI_CONCENTRATION: {
        totalThreshold: 20000,
        ratioThreshold: 0.6,
        tag: 'PI_CONCENTRATION' as RiskTag
    },
    COMMITTED_NO_PO: {
        tag: 'COMMITTED_NO_PO' as RiskTag
    }
}

/**
 * Analiza una oportunidad individual y genera alertas
 */
export function analyzeOpportunityRisks(opp: Opportunity): string[] {
    const alerts: string[] = []

    // 1. LARGE_LOW_PROB: Monto > 25k Y Probabilidad < 50%
    if (opp.amount > RULES.LARGE_LOW_PROB.amountThreshold && opp.probability < RULES.LARGE_LOW_PROB.probThreshold) {
        alerts.push(RULES.LARGE_LOW_PROB.tag)
    }

    // 2. COMMITTED_NO_PO: Categoría "Committed" Y falta "PO Number"
    // Asumimos que 'stage' contiene la categoría forecast (Commit, Best Case, Pipeline)
    // Normalizamos a mayúsculas para comparar
    const stage = (opp.stage || '').toUpperCase()
    // Verificamos si es Committed (puede venir como 'Commit', 'Committed', etc)
    if (stage.includes('COMMIT')) {
        // Verificamos si NO tiene PO Number (null, empty, o '0')
        // El campo en BD es po_number, pero en el objeto Opportunity puede que no esté mapeado aún en types.ts
        // Asumiremos que extendemos el tipo Opportunity
        const poNumber = (opp as any).po_number
        if (!poNumber || poNumber.toString().trim() === '' || poNumber === '0') {
            alerts.push(RULES.COMMITTED_NO_PO.tag)
        }
    }

    return alerts
}

/**
 * Analiza concentración por PI (Project Identifier)
 * Si un PI suma > 20k y una sola opp es > 60% del total
 */
export function analyzeConcentrationRisks(opportunities: Opportunity[]): Record<string, string[]> {
    // Agrupar por PI Number
    const piGroups: Record<string, Opportunity[]> = {}

    opportunities.forEach(opp => {
        // Usamos pi_number si existe, sino tratamos de extraerlo del ID o Nombre si fuera posible
        // Por ahora confiamos en el campo pi_number
        const pi = (opp as any).pi_number
        if (pi) {
            if (!piGroups[pi]) piGroups[pi] = []
            piGroups[pi].push(opp)
        }
    })

    const risksByOppId: Record<string, string[]> = {}

    Object.entries(piGroups).forEach(([pi, opps]) => {
        if (opps.length <= 1) return // Si hay solo una, es concentración del 100% natural, quizás no es riesgo?
        // El prompt dice: "Si un mismo Proyecto (PI) suma > $20k Y una sola oportunidad representa > 60% del total"
        // Si hay solo una opp y suma > 20k, es > 60% (es 100%). Podría ser riesgo si queremos diversificación.
        // Pero típicamente concentración se refiere a dependencia de una sola en un grupo.

        const totalAmount = opps.reduce((sum, o) => sum + o.amount, 0)

        if (totalAmount > RULES.PI_CONCENTRATION.totalThreshold) {
            opps.forEach(opp => {
                const ratio = opp.amount / totalAmount
                if (ratio > RULES.PI_CONCENTRATION.ratioThreshold) {
                    if (!risksByOppId[opp.id]) risksByOppId[opp.id] = []
                    risksByOppId[opp.id].push(RULES.PI_CONCENTRATION.tag)
                }
            })
        }
    })

    return risksByOppId
}

/**
 * Genera el "Weekly Plan"
 */
export function generateWeeklyPlan(opportunities: Opportunity[]) {
    // 1. Agrupar por país y calcular monto en riesgo (oportunidades con alertas)
    const countryRisk: Record<string, number> = {}

    opportunities.forEach(opp => {
        const country = opp.country || 'Unknown'
        // Si tiene alertas críticas (Large Low Prob es la más crítica financiera)
        // O si simplemente tiene weighted_amount bajo algun criterio
        // Usaremos amount de oportunidades con alertas LARGE_LOW_PROB
        const hasCriticalRisk = (opp as any).alerts?.includes('LARGE_LOW_PROB')

        if (hasCriticalRisk) {
            countryRisk[country] = (countryRisk[country] || 0) + opp.amount
        }
    })

    // Ordenar países por riesgo descendente
    const sortedCountries = Object.entries(countryRisk)
        .sort((a, b) => b[1] - a[1])
        .map(([country]) => country)

    // Estrategia de asignación:
    // Lunes: Top 1 País con más riesgo
    // Martes: Top 2
    // Miércoles: Top 3
    // Jueves: Oportunidades "Best Case" globales (Prob >= 50% y < 75%)
    // Viernes: Oportunidades "Committed" (Prob >= 75%)

    // Filtrar opps para Jueves y Viernes
    const bestCaseOpps = opportunities.filter(o => o.probability >= 50 && o.probability < 75)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5) // Top 5

    const commitOpps = opportunities.filter(o => o.probability >= 75)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5) // Top 5

    return {
        monday: sortedCountries[0] ? { country: sortedCountries[0], focus: 'Revisión Riesgo Alto' } : null,
        tuesday: sortedCountries[1] ? { country: sortedCountries[1], focus: 'Revisión Riesgo Alto' } : null,
        wednesday: sortedCountries[2] ? { country: sortedCountries[2], focus: 'Revisión Riesgo Alto' } : null,
        thursday: { focus: 'Oportunidades Best Case (>50%)', items: bestCaseOpps },
        friday: { focus: 'Cierre Committed (>75%)', items: commitOpps }
    }
}
