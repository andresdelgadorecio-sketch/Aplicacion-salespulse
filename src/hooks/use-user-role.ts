'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/types'

export const useUserRole = () => {
    const [role, setRole] = useState<UserRole | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setRole(null)
                    return
                }

                // EMERGENCY BACKDOOR: Force admin for specific email
                if (user.email === 'andres.delgado.recio@gmail.com') {
                    setRole('admin')
                    setLoading(false)
                    return
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (error) {
                    console.error('Error fetching role:', error)
                    return
                }

                if (profile) {
                    setRole(profile.role as UserRole)
                }
            } catch (error) {
                console.error('Error in useUserRole:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRole()
    }, [])

    return { role, loading, isAdmin: role === 'admin', isCommercial: role === 'commercial', isSupervisor: role === 'supervisor' }
}
