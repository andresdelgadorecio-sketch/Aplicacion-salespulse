// Tipos de base de datos
export type UserRole = 'admin' | 'commercial' | 'supervisor';
export type AccountStatus = 'Growth' | 'Risk' | 'Stable';
export type OpportunityStatus = 'Active' | 'Closed Won' | 'Closed Lost';
export type PlanType = 'Free' | 'Pro' | 'Enterprise';
export type Country = 'COLOMBIA' | 'ECUADOR' | 'PERU' | 'General' | 'Unknown';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    created_at: string;
}

export interface Account {
    id: string;
    name: string;
    country: Country;
    status: AccountStatus;
    created_at: string;
}

export interface Product {
    id: string;
    category: string;
    sub_category: string | null;
    base_price: number | null;
}

export interface Opportunity {
    id: string;
    name: string;
    account_id: string;
    amount: number;
    probability: number;
    weighted_amount: number; // Campo calculado
    alerts?: string[]; // Array de alertas de riesgo
    pi_number?: string;
    po_number?: string;
    close_date: string;
    risk_tags: string[]; // Deprecated? Or keeping for backward comp.
    stage: string; // Forecast Category
    status: OpportunityStatus;
    country: string; // From Account or direct
    created_at: string;
    // Relaciones
    account?: Account;
}

export interface AOPTarget {
    id: string;
    month_period: string; // Formato: '2026-01'
    target_amount: number;
    country: Country | null;
}

export interface SalesRecord {
    id: string;
    account_id: string | null;
    product_id: string | null;
    amount: number;
    sale_date: string;
    created_at: string;
    // Relaciones
    account?: Account;
    product?: Product;
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_type: PlanType;
    status: string;
    current_period_end: string | null;
    created_at: string;
}

// Tipos para el Forecast Engine
export interface ForecastResult {
    weightedForecast: number;
    totalPipeline: number;
    opportunityCount: number;
}

export interface GapAnalysis {
    currentSales: number;
    forecast: number;
    aopTarget: number;
    gap: number;
    gapPercentage: number;
    status: 'on-track' | 'at-risk' | 'behind';
}

// Tipos para el Risk Engine
export type RiskTag = 'High Value / Low Prob' | 'Concentration' | 'Stalled';

export interface AtRiskOpportunity extends Opportunity {
    riskScore: number;
    riskReasons: RiskTag[];
}

// Tipos para gráficos
export interface ChartDataPoint {
    name: string;
    value: number;
    fill?: string;
}

export interface BarChartData {
    period: string;
    actual: number;
    target: number;
}
