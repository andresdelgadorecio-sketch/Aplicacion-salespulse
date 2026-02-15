const { createClient } = require('@supabase/supabase-js');

// Config from .env.local
const supabaseUrl = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTMwMzg4MCwiZXhwIjo0OTI0OTc3NDgwLCJyb2xlIjoiYW5vbiJ9.uqTDX051jILdiJ0kF2MU_R9hZ6ZdUwwGMCvzo9fRuNA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoUser() {
    console.log('Attempting to create demo user (demo@salespulse.com)...');

    const email = 'demo@salespulse.com';
    const password = 'DemoUser2026!';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Demo User',
                role: 'analyst'
            }
        }
    });

    if (error) {
        console.error('❌ Error creating user:', error.message);
        return;
    }

    console.log('✅ User creation request sent!');
    console.log('User ID:', data.user?.id);

    if (data.session) {
        console.log('🎉 SUCCESS: Session created immediately. The user is auto-confirmed and ready to use!');
    } else {
        console.log('⚠️ PENDING: User created but no session returned.');
        console.log('This usually means "Email Confirmations" are enabled in Supabase.');
        console.log('ACTION REQUIRED: Please go to Supabase Dashboard -> Authentication -> Users and manually confirm this user.');
    }
}

createDemoUser();
