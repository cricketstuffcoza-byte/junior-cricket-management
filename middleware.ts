import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const protectedPath = path.startsWith('/dashboard') || path.startsWith('/school') || path.startsWith('/operations') || path.startsWith('/parent');

  if (!user && protectedPath) return NextResponse.redirect(new URL('/login', request.url));
  if (user && path === '/login') return NextResponse.redirect(new URL('/dashboard', request.url));
  if (user && user.user_metadata?.force_password_change === true && protectedPath) return NextResponse.redirect(new URL('/change-password', request.url));
  if (user && user.user_metadata?.force_password_change === true && path === '/change-password') return response;

  return response;
}

export const config = { matcher: ['/dashboard/:path*', '/school/:path*', '/operations/:path*', '/parent/:path*', '/login', '/change-password'] };
