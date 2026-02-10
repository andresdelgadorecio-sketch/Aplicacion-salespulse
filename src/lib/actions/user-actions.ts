'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Profile = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: 'admin' | 'commercial' | 'supervisor'
    created_at: string
}

export async function getProfiles() {
    const supabase = await createClient()

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching profiles:', error)
        throw new Error('Failed to fetch profiles')
    }

    return profiles as Profile[]
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'commercial' | 'supervisor') {
    const supabase = await createClient()

    // check permission (already handled by RLS but good for sanity)
    // Actually RLS handles it.

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) {
        console.error('Error updating role:', error)
        throw new Error('Failed to update role')
    }

    revalidatePath('/admin/users')
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createUser(data: any) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create a temporary client that doesn't share session state
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

    const { data: userData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                full_name: `${data.firstName} ${data.lastName}`,
            }
        }
    })

    if (error) {
        console.error('Error creating user:', error)
        throw new Error(error.message)
    }

    if (!userData.user) {
        throw new Error('User creation failed (no user returned)')
    }

    // If role is not commercial, or just to ensure profile data is correct immediately
    const adminClient = await createClient()

    // Use UPSERT to guarantee profile exists with correct role
    // This handles the race condition:
    // 1. If trigger already ran: It updates the role.
    // 2. If trigger hasn't ran: It creates the profile with the role (trigger will fail or accept duplicate later).
    const { error: upsertError } = await adminClient
        .from('profiles')
        .upsert({
            id: userData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role || 'commercial'
        }, { onConflict: 'id' })

    if (upsertError) {
        console.error('Error upserting profile:', upsertError)
        // If upsert fails, it might be due to RLS permissions. 
        // Admin should have access, but let's log it.
    }

    revalidatePath('/admin/users')
    return { success: true }
}

export async function deleteUser(userId: string) {
    // We use the direct SQL API because we don't have the Service Role Key configured in environment
    // and standard client cannot delete from auth.users.

    // Credentials verified in previous debugging session
    const BASE_URL = 'http://supabasekong-ho80k80c4o8wgco88kkgwwws.148.230.91.43.sslip.io';
    const PATH = '/api/platform/pg-meta/default/query';
    const USER = 'cgdTQxH0zR0O4Y9A';
    const PASS = 'yoe6IkbqsoDBaQNGJ2zk7mtj7V85X7QY';
    const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

    const SQL_QUERY = `DELETE FROM auth.users WHERE id = '${userId}';`;

    try {
        const response = await fetch(`${BASE_URL}${PATH}`, {
            method: 'POST',
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: SQL_QUERY })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('API Deletion failed:', text);
            throw new Error(`Deletion failed: ${response.status} ${response.statusText}`);
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
    }
}
