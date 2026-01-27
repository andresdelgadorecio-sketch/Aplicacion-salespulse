-- =============================================================================
-- VISTAS ANALÍTICAS ADICIONALES: TABLERO DE OPORTUNIDADES (Sales Pulse)
-- =============================================================================

-- 4. VISTA: DETALLE DE FORECAST Y PIPELINE (Para Matriz de Forecast y KPIs de Oportunidades)
-- Responde: "¿Cuál es el pipeline bruto en Ecuador?", "¿Cuál es el Gap contra la meta en Marzo?"
CREATE OR REPLACE VIEW ai_forecast_detailed AS
WITH monthly_data AS (
    SELECT 
        to_char(close_date, 'YYYY-MM') as month_period,
        country,
        -- Pipeline Bruto: Todo lo que NO esté perdido (incluso lo ganado cuenta como pipeline ejecutado/cerrado en contextos históricos, 
        -- pero para "Open Pipeline" filtramos por status. Aquí sumamos TODO lo activo + ganado para ver "Volumen de Negocio")
        -- Ajuste según imagen: "Total Pipeline (Bruto)" suele ser lo que está vivo. Asumiremos Status != 'Closed Lost'.
        SUM(amount) FILTER (WHERE stage != 'Closed Lost') as pipeline_gross_amount,
        
        -- Forecast Ponderado: La cifra "Realista"
        SUM(weighted_amount) as forecast_weighted,
        
        -- Volumen en Riesgo: Oportunidades con Alertas
        SUM(amount) FILTER (WHERE alerts IS NOT NULL AND status = 'Active') as risk_amount,
        
        -- Conteo
        COUNT(*) as deal_count
    FROM opportunities
    GROUP BY 1, 2
),
monthly_goals AS (
    SELECT 
        month_period,
        country,
        SUM(target_amount) as target_amount
    FROM aop_targets
    GROUP BY 1, 2
)
SELECT 
    COALESCE(d.month_period, g.month_period) as period,
    COALESCE(d.country, g.country) as country,
    COALESCE(d.pipeline_gross_amount, 0) as pipeline_gross,
    COALESCE(d.forecast_weighted, 0) as forecast_weighted,
    COALESCE(d.risk_amount, 0) as volume_at_risk,
    COALESCE(g.target_amount, 0) as goal_aop,
    -- Gap: Meta - Forecast Ponderado (cuánto nos falta para llegar con lo ponderado)
    (COALESCE(g.target_amount, 0) - COALESCE(d.forecast_weighted, 0)) as gap_to_goal,
    -- Achievement %
    CASE 
        WHEN COALESCE(g.target_amount, 0) > 0 THEN 
            ROUND((COALESCE(d.forecast_weighted, 0) / g.target_amount) * 100, 2)
        ELSE 0 
    END as achievement_percent
FROM monthly_data d
FULL OUTER JOIN monthly_goals g ON d.month_period = g.month_period AND d.country = g.country;


-- 5. VISTA: ALERTAS CRÍTICAS (Para lista de "Pipeline en Riesgo")
-- Responde: "¿Qué oportunidades están en riesgo?", "¿Cuáles son las alertas críticas?"
CREATE OR REPLACE VIEW ai_critical_alerts AS
SELECT 
    o.id,
    o.name as opportunity_name,
    COALESCE(a.name, 'Unknown Account') as account_name,
    o.amount,
    o.stage,
    o.probability,
    o.country,
    o.close_date,
    o.alerts, -- Array de alertas técnico
    -- Descripción amigable para la IA
    CONCAT('Riesgo detectado en ', o.name, ': ', array_to_string(o.alerts, ', ')) as risk_summary
FROM opportunities o
LEFT JOIN accounts a ON o.account_id = a.id
WHERE 
    o.status = 'Active' 
    AND (
        o.alerts IS NOT NULL 
        OR o.risk_tags IS NOT NULL 
        OR o.probability < 0.3 -- Ejemplo de criterio adicional si se desea
    )
ORDER BY o.amount DESC;

-- PERMISOS
GRANT SELECT ON ai_forecast_detailed TO anon, service_role;
GRANT SELECT ON ai_critical_alerts TO anon, service_role;
