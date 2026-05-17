import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url));
    return response;
  }

  if (pathname === '/' || pathname === '/privacidad') {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = user.app_metadata?.role as string | undefined;
  const setupCompletado = user.app_metadata?.setup_completado as boolean | undefined;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard') && role === 'cliente') {
    if (!setupCompletado && pathname !== '/dashboard/setup') {
      return NextResponse.redirect(new URL('/dashboard/setup', request.url));
    }
    if (setupCompletado && pathname === '/dashboard/setup') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
