import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── Daftar email yang berhak masuk sebagai Admin / HQ ───────────────────────
const ADMIN_EMAILS = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com"];
const JURY_EMAILS  = ["juri1@ncc.id", "juri2@ncc.id", "juri3@ncc.id"];

/** Tambahkan security headers ke setiap response */
function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi response dasar
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;
  const loginUrl = new URL('/login', request.url);
  const dashUrl  = new URL('/dashboard', request.url);

  const isProtectedPath = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/hq') || 
                          pathname.startsWith('/admin') || 
                          pathname.startsWith('/juri');

  let user = null;

  // 2. Cegah crash jika Environment Variables belum terset
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isProtectedPath) {
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  } else {
    try {
      // 3. Bangun koneksi Supabase melalui cookie (server-side)
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
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

      // 4. Ambil user yang sedang aktif (validasi token server-side) dengan try-catch agar safe
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch (err) {
      console.error("Middleware Auth Error:", err);
      user = null;
    }
  }

  // Helpers pengecekan peran & cookie hints
  const hasAdminCookie = request.cookies.get('ncc_admin_hint')?.value === '1';
  const hasUserCookie = request.cookies.get('ncc_hint')?.value === '1';

  const isAdmin = hasAdminCookie || !!(user && (
    (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    user.user_metadata?.role === 'admin'
  ));
  const isJury = !!(user && (
    (user.email && JURY_EMAILS.includes(user.email.toLowerCase())) ||
    user.user_metadata?.role === 'juri'
  ));
  const isAuthenticated = !!user || hasUserCookie || hasAdminCookie;

  // ─────────────────────────────────────────────────────────────────────────
  // 5. 🚦 ROUTING GUARD — semua area sensitif dijaga di sini
  // ─────────────────────────────────────────────────────────────────────────

  // ── /hq/* — khusus Admin HQ ──────────────────────────────────────────────
  if (pathname.startsWith('/hq')) {
    if (!isAuthenticated) return addSecurityHeaders(NextResponse.redirect(loginUrl));
    if (!isAdmin) return addSecurityHeaders(NextResponse.redirect(dashUrl));
  }

  // ── /admin/* — khusus Admin ──────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) return addSecurityHeaders(NextResponse.redirect(loginUrl));
    if (!isAdmin) return addSecurityHeaders(NextResponse.redirect(dashUrl));
  }

  // ── /juri/* — Admin atau Juri ────────────────────────────────────────────
  if (pathname.startsWith('/juri')) {
    if (!isAuthenticated) return addSecurityHeaders(NextResponse.redirect(loginUrl));
    if (!isAdmin && !isJury) return addSecurityHeaders(NextResponse.redirect(dashUrl));
  }

  // ── /dashboard/* — semua user yang sudah login ───────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 6. Lolos semua guard → lanjutkan dengan security headers
  return addSecurityHeaders(response);
}

// 7. Terapkan middleware ke semua rute kecuali aset statis
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
