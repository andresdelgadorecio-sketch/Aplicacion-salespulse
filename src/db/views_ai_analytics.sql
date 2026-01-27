-- =============================================================================
-- VISTAS ANALÍTICAS PARA EL AGENTE DE IA (Sales Pulse)
-- =============================================================================
-- Estas vistas consolidan la información del Dashboard y el Analizador para permitir
-- consultas de lenguaje natural rápidas y precisas desde n8n.

-- 1. VISTA: METRICAS GLOBALES Y POR PAÍS (KPIs del Dashboard Principal)
-- Responde: "¿Cuánto vendimos en Colombia en 2025?", "¿Cuál es el forecast vs meta?"
CREATE OR REPLACE VIEW ai_dashboard_metrics AS
WITH monthly_actuals AS (
    SELECT 
        to_char(sale_date, 'YYYY-MM') as month_period,
        -- Si sales_records tiene country, úsalo. Si no, intenta unir con accounts.
        -- Asumiendo que podemos obtener el país de alguna forma. 
        -- Si sales_records no tiene country directo, se hace JOIN con accounts
        COALESCE(acc.country, 'Unknown') as country,
        SUM(sr.amount) as actual_sales
    FROM sales_records sr
    LEFT JOIN accounts acc ON sr.account_id = acc.id
    GROUP BY 1, 2
),
monthly_forecast AS (
    SELECT 
        to_char(close_date, 'YYYY-MM') as month_period,
        country,
        SUM(weighted_amount) as forecast_weighted,
        SUM(amount) FILTER (WHERE stage NOT IN ('Closed Won', 'Closed Lost')) as pipeline_open,
        COUNT(*) as opportunity_count
    FROM opportunities
    GROUP BY 1, 2
),
monthly_targets AS (
    SELECT 
        month_period,
        country,
        SUM(target_amount) as target_amount
    FROM aop_targets
    GROUP BY 1, 2
)
SELECT 
    COALESCE(m.month_period, f.month_period, t.month_period) as period,
    COALESCE(m.country, f.country, t.country) as country,
    COALESCE(m.actual_sales, 0) as actual_sales,
    COALESCE(f.forecast_weighted, 0) as forecast_weighted,
    COALESCE(f.pipeline_open, 0) as pipeline_open,
    COALESCE(t.target_amount, 0) as target_amount,
    -- Campos calculados útiles para la IA
    (COALESCE(m.actual_sales, 0) - COALESCE(t.target_amount, 0)) as gap_vs_target,
    CASE 
        WHEN COALESCE(t.target_amount, 0) > 0 THEN 
            ROUND((COALESCE(m.actual_sales, 0) / t.target_amount) * 100, 2)
        ELSE 0 
    END as achievement_percentage
FROM monthly_actuals m
FULL OUTER JOIN monthly_forecast f ON m.month_period = f.month_period AND m.country = f.country
FULL OUTER JOIN monthly_targets t ON COALESCE(m.month_period, f.month_period) = t.month_period AND COALESCE(m.country, f.country) = t.country;


-- 2. VISTA: ANÁLISIS POR CUENTA (Pestaña Analizador - Desempeño y Top Accounts)
-- Responde: "¿Cómo va la cuenta Assis Pronta?", "¿Quiénes son los top clientes?"
CREATE OR REPLACE VIEW ai_account_analytics AS
WITH account_sales AS (
    SELECT 
        account_id,
        SUM(amount) as total_sales_ltm, -- Últimos 12 meses o Total Año, aquí sumamos todo lo disponible
        MAX(sale_date) as last_sale_date
    FROM sales_records
    GROUP BY 1
),
account_pipeline AS (
    SELECT 
        account_id,
        SUM(weighted_amount) as total_weighted_pipeline,
        SUM(amount) FILTER (WHERE stage NOT IN ('Closed Won', 'Closed Lost')) as open_pipeline_value,
        COUNT(*) as open_deals_count
    FROM opportunities
    WHERE status = 'Active'
    GROUP BY 1
)
SELECT 
    a.id,
    a.name as account_name,
    a.country,
    a.status as account_status,
    COALESCE(s.total_sales_ltm, 0) as total_actual_sales,
    COALESCE(p.total_weighted_pipeline, 0) as forecast_weighted,
    COALESCE(p.open_pipeline_value, 0) as pipeline_value,
    COALESCE(p.open_deals_count, 0) as active_opportunities_count,
    s.last_sale_date
FROM accounts a
LEFT JOIN account_sales s ON a.id = s.account_id
LEFT JOIN account_pipeline p ON a.id = p.account_id;


-- 3. VISTA: ANÁLISIS DE PRODUCTOS (Product Mix)
-- Responde: "¿Qué producto vendemos más?", "Ventas de OnGuard vs Lectores"
CREATE OR REPLACE VIEW ai_product_analytics AS
SELECT 
    p.category,
    p.sub_category,
    -- Si quieres detalle por producto, agrega p.name si existe, o agrupa por categoría
    COALESCE(a.country, 'Global') as country,
    SUM(sr.amount) as total_revenue,
    COUNT(*) as units_sold, -- O transacciones
    MAX(sr.sale_date) as last_sale_date
FROM sales_records sr
JOIN products p ON sr.product_id = p.id
LEFT JOIN accounts a ON sr.account_id = a.id
GROUP BY 
    p.category, 
    p.sub_category,
    a.country;

-- PERMISOS PARA N8N (Importante para que el Agente pueda leerlas)
GRANT SELECT ON ai_dashboard_metrics TO anon, service_role;
GRANT SELECT ON ai_account_analytics TO anon, service_role;
GRANT SELECT ON ai_product_analytics TO anon, service_role;
