const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
const supabaseServiceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2OTMwMzg4MCwiZXhwIjo0OTI0OTc3NDgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.wEemj3_39BGqwEF4kYz7tRuIwGKVukAx4cNlI3tmFRk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Attempting to execute SQL via RPC...');

    const sql = `
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'commercial', 'supervisor'));
    `;

    // Try standard names for SQL execution functions
    const functions = ['exec_sql', 'execute_sql', 'exec', 'query'];

    for (const fn of functions) {
        console.log(`Trying RPC function: ${fn}...`);
        const { data, error } = await supabase.rpc(fn, { sql_query: sql });

        if (!error) {
            console.log(`Success! Executed via ${fn}`);
            return;
        } else {
            console.log(`Failed with ${fn}:`, error.message);
            // If the error is not "function not found", maybe it requires different params.
            // But usually it's "function ... does not exist"
        }
    }

    // Try a different param name sometimes used: 'query'
    console.log('Trying exec_sql with param "query"...');
    const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: sql });
    if (!e2) {
        console.log('Success! Executed via exec_sql (query param)');
        return;
    }

    console.error('Could not execute SQL via RPC. The database likely does not have a helper function exposed for this.');
}

run();
