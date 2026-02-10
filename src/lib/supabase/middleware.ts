import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    // RBAC: Fetch User Role if authenticated
    let userRole = null
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        userRole = profile?.role
    }

    // Protected routes
    const protectedPaths = ['/summary', '/risks', '/analyzer', '/upload']
    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // RBAC Redirections
    const path = request.nextUrl.pathname

    // 1. Commercial User Restrictions
    // Commercial users should NOT access /analyzer (Metrics only for Supervisor/Admin)
    if (userRole === 'commercial' && path.startsWith('/analyzer')) {
        return NextResponse.redirect(new URL('/summary', request.url))
    }

    // 2. Supervisor User Restrictions
    // Supervisor should NOT access /upload (Upload only for Commercial/Admin)
    if (userRole === 'supervisor' && path.startsWith('/upload')) {
        return NextResponse.redirect(new URL('/analyzer', request.url))
    }

    // 3. Admin Routes (Example)
    // if (path.startsWith('/admin') && userRole !== 'admin') ...

    // Redirect authenticated users from auth pages
    const authPaths = ['/login', '/register']
    const isAuthPath = authPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    if (isAuthPath && user) {
        return NextResponse.redirect(new URL('/summary', request.url))
    }

    return response
}
