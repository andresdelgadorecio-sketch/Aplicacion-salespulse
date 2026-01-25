-- =============================================
-- SALES PULSE - Esquema de Base de Datos
-- =============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Cuentas y Canales
-- =============================================
CREATE TABLE accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL CHECK (country IN ('COLOMBIA', 'ECUADOR', 'PERU')),
    status TEXT CHECK (status IN ('Growth', 'Risk', 'Stable')) DEFAULT 'Stable',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. Productos
-- =============================================
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,
    sub_category TEXT,
    base_price DECIMAL(15,2)
);

-- =============================================
-- 3. Motor de Oportunidades (Pipeline)
-- =============================================
CREATE TABLE opportunities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    total_amount DECIMAL(15,2) NOT NULL,
    probability DECIMAL(5,2) NOT NULL CHECK (probability >= 0 AND probability <= 100),
    weighted_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount * (probability / 100)) STORED,
    close_date DATE NOT NULL,
    risk_tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed Won', 'Closed Lost')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. Metas Anuales (AOP - Annual Operating Plan)
-- =============================================
CREATE TABLE aop_targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    month_period TEXT NOT NULL, -- Formato: '2026-01'
    target_amount DECIMAL(15,2) NOT NULL,
    country TEXT,
    UNIQUE(month_period, country)
);

-- =============================================
-- 5. Registro de Ventas Reales
-- =============================================
CREATE TABLE sales_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    product_id UUID REFERENCES products(id),
    amount DECIMAL(15,2) NOT NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. Suscripciones y Accesos
-- =============================================
CREATE TABLE user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT CHECK (plan_type IN ('Free', 'Pro', 'Enterprise')),
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. Perfiles de Usuario
-- =============================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Índices de Rendimiento
-- =============================================
CREATE INDEX idx_sales_date ON sales_records(sale_date);
CREATE INDEX idx_opp_close_date ON opportunities(close_date);
CREATE INDEX idx_accounts_country ON accounts(country);
CREATE INDEX idx_aop_period ON aop_targets(month_period);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE aop_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para Accounts (lectura pública, escritura admin)
CREATE POLICY "Authenticated users can view accounts" ON accounts
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage accounts" ON accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para Products
CREATE POLICY "Authenticated users can view products" ON products
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para Opportunities
CREATE POLICY "Authenticated users can view opportunities" ON opportunities
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage opportunities" ON opportunities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para AOP Targets
CREATE POLICY "Authenticated users can view aop_targets" ON aop_targets
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage aop_targets" ON aop_targets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para Sales Records
CREATE POLICY "Authenticated users can view sales_records" ON sales_records
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sales_records" ON sales_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Políticas para User Subscriptions
CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions" ON user_subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- Trigger para crear perfil automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'analyst')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
