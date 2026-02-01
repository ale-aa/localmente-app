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
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Se l'utente è autenticato e prova ad accedere a /login, redirect alla dashboard
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANTE: devi restituire la supabaseResponse. Se restituisci un NextResponse.next() senza
  // passarlo attraverso il processo di creazione del client Supabase, potresti cancellare
  // i cookie che il server invia al browser.

  return supabaseResponse
}
