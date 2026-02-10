import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Evita di scrivere logica tra createServerClient e
  // supabase.auth.getUser(). Una semplice disequazione potrebbe rendere il codice difficile da debuggare
  // errori!

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proteggi le route /dashboard/* - richiedi autenticazione
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Se l'utente è autenticato e prova ad accedere a /auth/login, redirect alla dashboard
  if (request.nextUrl.pathname.startsWith('/auth/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // CHECK ONBOARDING: Se utente autenticato e siamo in /dashboard (ma NON in /dashboard/onboarding)
  if (
    user &&
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.nextUrl.pathname.startsWith('/dashboard/onboarding')
  ) {
    try {
      // Controlla se ha completato l'onboarding
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      // Se la colonna non esiste ancora (error 42703), ignora il check
      if (error && error.code === '42703') {
        console.log('[Middleware] Colonna onboarding_completed non esiste ancora, skip check')
        return supabaseResponse
      }

      // Se onboarding non completato, redirect a onboarding
      if (profile && profile.onboarding_completed === false) {
        console.log('[Middleware] Onboarding non completato, redirect')
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/onboarding/user-type'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('[Middleware] Errore check onboarding:', error)
      // In caso di errore, lascia passare
    }
  }

  // IMPORTANTE: devi restituire la supabaseResponse. Se restituisci un NextResponse.next() senza
  // passarlo attraverso il processo di creazione del client Supabase, potresti cancellare
  // i cookie che il server invia al browser.

  return supabaseResponse
}
