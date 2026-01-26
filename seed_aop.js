
const { createClient } = require('@supabase/supabase-js');

// Use environment variables or hardcoded for this script (since it's a one-off)
const supabaseUrl = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTMwMzg4MCwiZXhwIjo0OTI0OTc3NDgwLCJyb2xlIjoiYW5vbiJ9.uqTDX051jILdiJ0kF2MU_R9hZ6ZdUwwGMCvzo9fRuNA';

const supabase = createClient(supabaseUrl, supabaseKey);

const targets = [
    { month_period: '2026-01', target_amount: 100000, country: 'General' },
    { month_period: '2026-02', target_amount: 580000, country: 'General' },
    { month_period: '2026-03', target_amount: 120000, country: 'General' },
    { month_period: '2026-04', target_amount: 130000, country: 'General' },
    { month_period: '2026-05', target_amount: 140000, country: 'General' },
    { month_period: '2026-06', target_amount: 150000, country: 'General' },
    { month_period: '2026-07', target_amount: 160000, country: 'General' },
    { month_period: '2026-08', target_amount: 170000, country: 'General' },
    { month_period: '2026-09', target_amount: 180000, country: 'General' },
    { month_period: '2026-10', target_amount: 190000, country: 'General' },
    { month_period: '2026-11', target_amount: 200000, country: 'General' },
    { month_period: '2026-12', target_amount: 250000, country: 'General' },
];

async function seed() {
    console.log('Seeding AOP data...');

    // Optional: Clean up existing entries for 2026 to avoid duplicates if partial
    // But we want to be careful. Let's just insert.
    // The table likely has an ID.

    for (const t of targets) {
        const { data, error } = await supabase
            .from('aop_targets')
            .upsert(t, { onConflict: 'month_period,country', ignoreDuplicates: false }) // Assuming unique constraint exists, check result
            .select();

        if (error) {
            // If unique constraint doesn't exist, upsert might fail or duplicate. 
            // If it fails on constraint error, we can try plain insert.
            console.log(`Upsert failed for ${t.month_period}:`, error.message);

            // Fallback to simple insert if not duplicate
            const { error: insertError } = await supabase.from('aop_targets').insert(t);
            if (insertError) console.error(`Insert failed for ${t.month_period}:`, insertError.message);
            else console.log(`Inserted ${t.month_period}`);
        } else {
            console.log(`Upserted ${t.month_period}`);
        }
    }
    console.log('Done.');
}

seed();
