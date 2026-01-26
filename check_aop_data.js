
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTMwMzg4MCwiZXhwIjo0OTI0OTc3NDgwLCJyb2xlIjoiYW5vbiJ9.uqTDX051jILdiJ0kF2MU_R9hZ6ZdUwwGMCvzo9fRuNA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAop() {
    const { data, error } = await supabase.from('aop_targets').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('AOP Targets Count:', data.length);
    console.log('Sample Data:', JSON.stringify(data.slice(0, 5), null, 2));

    // Check for 2026 data specifically
    const data2026 = data.filter(d => d.month_period && d.month_period.startsWith('2026'));
    console.log('2026 Entries:', data2026.length);
}

checkAop();
