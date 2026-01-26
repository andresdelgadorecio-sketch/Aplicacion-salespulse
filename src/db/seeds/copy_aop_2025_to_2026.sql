
-- Copiar objetivos de AOP del 2025 al 2026
-- Esto es necesario porque el Dashboard está mostrando el año fiscal 2026 (año actual del sistema),
-- pero los datos en la base de datos están registrados con fechas de 2025.

INSERT INTO aop_targets (month_period, target_amount, country)
SELECT 
  TO_CHAR((month_period::date + INTERVAL '1 year'), 'YYYY-MM-DD'), -- Sumar 1 año a la fecha
  target_amount, 
  country 
FROM aop_targets 
WHERE month_period LIKE '2025%'
ON CONFLICT (month_period, country) 
DO UPDATE SET target_amount = EXCLUDED.target_amount;

-- Verificación opcional
SELECT * FROM aop_targets WHERE month_period LIKE '2026%';
