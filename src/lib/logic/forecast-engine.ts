import { Opportunity, ForecastResult, GapAnalysis, AOPTarget, SalesRecord } from '@/lib/types'

/**
 * Calcula el Forecast Ponderado: Σ(Monto × Probabilidad)
 */
export function calculateWeightedForecast(opportunities: Opportunity[]): ForecastResult {
    const activeOpportunities = opportunities.filter(opp => opp.status === 'Active')

    const weightedForecast = activeOpportunities.reduce(
        (sum, opp) => sum + (opp.amount * opp.probability / 100),
        0
    )

    const totalPipeline = activeOpportunities.reduce(
        (sum, opp) => sum + opp.amount,
        0
    )

    return {
        weightedForecast,
        totalPipeline,
        opportunityCount: activeOpportunities.length,
    }
}

/**
 * Calcula el análisis de Gap: (Ventas_Actuales + Forecast_Ponderado) - Meta_AOP
 */
export function calculateGapAnalysis(
    currentSales: number,
    forecast: number,
    aopTarget: number
): GapAnalysis {
    const projected = currentSales + forecast
    const gap = projected - aopTarget
    const gapPercentage = aopTarget > 0 ? (gap / aopTarget) * 100 : 0

    let status: GapAnalysis['status']
    if (gapPercentage >= 0) {
        status = 'on-track'
    } else if (gapPercentage >= -10) {
        status = 'at-risk'
    } else {
        status = 'behind'
    }

    return {
        currentSales,
        forecast,
        aopTarget,
        gap,
        gapPercentage,
        status,
    }
}

/**
 * Obtiene el total de ventas por período
 */
export function getSalesByPeriod(
    records: SalesRecord[],
    startDate: Date,
    endDate: Date
): number {
    return records
        .filter(record => {
            const saleDate = new Date(record.sale_date)
            return saleDate >= startDate && saleDate <= endDate
        })
        .reduce((sum, record) => sum + record.amount, 0)
}

/**
 * Obtiene ventas agrupadas por mes
 */
export function getSalesGroupedByMonth(
    records: SalesRecord[]
): Record<string, number> {
    return records.reduce((acc, record) => {
        const date = new Date(record.sale_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        acc[monthKey] = (acc[monthKey] || 0) + record.amount
        return acc
    }, {} as Record<string, number>)
}

/**
 * Compara forecast vs targets mensuales
 */
export function getMonthlyComparison(
    salesByMonth: Record<string, number>,
    targets: AOPTarget[],
    opportunities: Opportunity[]
): Array<{
    period: string
    actual: number
    target: number
    forecast: number
    gap: number
}> {
    const allPeriods: string[] = [
        ...Object.keys(salesByMonth),
        ...targets.map(t => t.month_period),
    ]
    const periods = Array.from(new Set(allPeriods)).sort()

    return periods.map(period => {
        const actual = salesByMonth[period] || 0
        const target = targets.find(t => t.month_period === period)?.target_amount || 0

        // Oportunidades que cierran en este mes
        const periodOpps = opportunities.filter(opp => {
            const closeMonth = opp.close_date.substring(0, 7)
            return closeMonth === period && opp.status === 'Active'
        })

        const forecast = periodOpps.reduce(
            (sum, opp) => sum + (opp.amount * opp.probability / 100),
            0
        )

        return {
            period,
            actual,
            target,
            forecast,
            gap: (actual + forecast) - target,
        }
    })
}
