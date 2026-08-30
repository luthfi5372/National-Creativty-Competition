"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShineBorder } from "@/components/ui/ShineBorder";
import { loginLocalUser } from "@/app/actions/auth";
import { User, Lock, Eye, EyeOff, Loader2, Trophy, ArrowRight, CheckCircle2, Mic, Microscope, BookOpen, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useLiveStats, GlobalStats } from "@/hooks/useLiveStats";

const FLOATING_ITEMS = [
  { label: "Olimpiade MIPA", icon: BookOpen, delay: 0 },
  { label: "Speech Contest", icon: Mic, delay: 0.5 },
  { label: "LKTI Nasional", icon: Microscope, delay: 1.0 },
  { label: "NCC 13th", icon: Sparkles, delay: 1.5 },
];

interface LoginFormClientProps {
  initialStats?: GlobalStats;
}

const DEFAULT_FALLBACK_STATS: GlobalStats = {
  totalParticipants: 0,
  provinces: 0,
  categories: 4,
  categoryBreakdown: { "Olimpiade MIPA": 0, "Speech Contest": 0, "LKTI Nasional": 0, "MTQ Nasional": 0 },
  regionStats: { "Sumatera": 0, "Jawa": 0, "Kalimantan": 0, "Sulawesi": 0, "Papua": 0, "Bali & Nusa Tenggara": 0 },
  detailedProvinceStats: {}
};

export default function LoginFormClient({ initialStats = DEFAULT_FALLBACK_STATS }: LoginFormClientProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<'dashboard' | 'hq'>('dashboard');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const router = useRouter();

  // Initialize with real-time live statistics from database
  const { stats: liveStats } = useLiveStats();
  const activeStats = liveStats || initialStats;

  const handleForgotPassword = async () => {
    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail) {
      showToast("Masukkan email Anda terlebih dahulu.", "error");
      return;
    }
    setForgotLoading(true);
    try {
      const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
      const supabaseBrowser = createBrowserClient();
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSuccess(true);
      showToast(`Link reset dikirim ke ${targetEmail}`, "success");
    } catch (e: any) {
      showToast(e.message || "Gagal mengirim email reset.", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  // --- MEMORI SISTEM NOTIFIKASI TOAST ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🚀 [Auth] Memulai proses otentikasi...");
    
    setLoading(true);
    setError(null);

    const activeEmail = email.trim().toLowerCase();
    const formData = new FormData();
    formData.append("email", activeEmail);
    formData.append("password", password.trim());

    // Eksekusi Login via Server Action
    const result = await loginLocalUser(formData);

    if (result.success) {
      document.cookie = "ncc_hint=1; path=/; max-age=604800; samesite=lax";
      if (result.isAdmin) {
        document.cookie = "ncc_admin_hint=1; path=/; max-age=604800; samesite=lax";
      }

      // 🚀 CLIENT-SIDE SUPABASE LOGIN BRIDGE
      // Log in directly on the browser client to guarantee that Supabase Auth
      // session is fully and persistently established in browser localStorage & cookies!
      try {
        const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
        const supabaseBrowser = createBrowserClient();
        
        let authEmail = activeEmail;
        let authPassword = password.trim();
        
        if (authEmail === 'admin') {
          authEmail = 'admin@ncc.id';
          authPassword = 'admin123';
        }
        
        console.log(`[Client Login Bridge] Attempting browser login for ${authEmail}...`);
        
        // Coba login langsung
        const { error: clientLoginError } = await supabaseBrowser.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        
        // Jika gagal karena akun belum terdaftar di Supabase Auth (misal reset DB),
        // lakukan registrasi instan di sisi klien
        if (clientLoginError && result.isAdmin) {
          console.log(`[Client Login Bridge] Admin account not in Supabase Auth, auto-registering...`);
          const { error: signUpError } = await supabaseBrowser.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: {
                full_name: "NCC Admin Command",
                username: authEmail.split('@')[0]
              }
            }
          });
          
          if (!signUpError) {
            await supabaseBrowser.auth.signInWithPassword({
              email: authEmail,
              password: authPassword
            });
            console.log(`[Client Login Bridge] Admin auto-registered and logged in successfully!`);
          }
        } else {
          console.log(`[Client Login Bridge] Browser login completed successfully!`);
        }
      } catch (err) {
        console.error(`[Client Login Bridge] Error bridging login:`, err);
      }

      setSuccess(true);
      setIsRedirecting(true);
      setRedirectTarget(result.isAdmin ? 'hq' : 'dashboard');
      
      setTimeout(() => {
        if (result.isAdmin) {
          window.location.href = '/hq'; 
        } else {
          window.location.href = '/dashboard';
        }
      }, 1800);
    } else {
      let errorMessage = result.error ?? "Email atau kata sandi salah.";
      // Hanya override pesan mentah Supabase dengan bahasa Indonesia yang ramah.
      // Jangan override pesan kustom dari server yang memberi arahan spesifik kepada user.
      if (errorMessage === "Invalid login credentials" || errorMessage === "Invalid login credentials.") {
        errorMessage = "Email atau kata sandi tidak cocok. Silakan periksa kembali!";
      }
      
      setError(errorMessage);
      setLoading(false);
      showToast(errorMessage, "error");
    }
  };


  // Full-screen redirect loading overlay
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
        {/* Animated background blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />

        {/* Spinning ring */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl">
              <Trophy size={36} className="text-yellow-300 drop-shadow-lg" style={{ animation: 'bounce 1s infinite' }} />
            </div>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-white text-2xl font-black mb-2 tracking-tight">
          {redirectTarget === 'hq' ? 'Masuk ke Command Center...' : 'Masuk ke Dashboard...'}
        </h2>
        <p className="text-indigo-200 text-sm font-medium mb-8">
          {redirectTarget === 'hq' ? 'Menyiapkan data admin NCC 13th' : 'Memuat profil peserta Anda'}
        </p>

        {/* Animated progress bar */}
        <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{
              animation: 'progressFill 1.5s ease-out forwards'
            }}
          />
        </div>

        <style>{`
          @keyframes progressFill {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 w-full">
      {/* ─── LEFT: Branding Panel ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-16 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 shrink-0">
        {/* Decorative blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-white w-full max-w-sm">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-indigo-600 border border-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
          >
            <span className="font-bold text-4xl text-white">N</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-3 tracking-tight leading-tight font-display"
          >
            National Creativity Competition
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-indigo-200 text-base leading-relaxed mb-10"
          >
            Platform resmi pendaftaran dan pengelolaan peserta kompetisi kreativitas nasional ke-13.
          </motion.p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-10 min-h-[96px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center min-h-[96px] flex flex-col justify-center"
            >
              <div className="text-2xl font-extrabold">{activeStats.totalParticipants}</div>
              <div className="text-xs text-indigo-200 mt-1">Peserta</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center min-h-[96px] flex flex-col justify-center"
            >
              <div className="text-2xl font-extrabold">{activeStats.provinces}</div>
              <div className="text-xs text-indigo-200 mt-1">Provinsi</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center min-h-[96px] flex flex-col justify-center"
            >
              <div className="text-2xl font-extrabold">{activeStats.categories}</div>
              <div className="text-xs text-indigo-200 mt-1">Kategori</div>
            </motion.div>
          </div>

          <div className="flex flex-col gap-2">
            {FLOATING_ITEMS.map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + item.delay }}
                className="flex items-center gap-4 text-sm font-medium text-white/80 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                   <item.icon size={16} className="text-white" />
                </div>
                {item.label}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Login Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="font-bold text-xl text-white">N</span>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">NCC 13th</div>
              <div className="text-xs text-slate-500">National Creativity Competition</div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 mb-1 font-display">
            Selamat Datang Kembali 👋
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-semibold text-indigo-600 hover:underline">
              Daftar sekarang
            </Link>
          </p>

          {/* Shine Border Card */}
          <ShineBorder
            colors={["#6366f1", "#8b5cf6", "#ec4899", "#6366f1"]}
            duration={5}
            borderWidth={1.5}
          >
            <div className="p-8">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-8 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Login Berhasil!</h3>
                    <p className="text-sm text-slate-500">Mengarahkan ke dashboard...</p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-center gap-2 p-3.5 text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl"
                        >
                          <span>⚠️</span> {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email / Username */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email / Username</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm"
                          placeholder="nama@email.com atau username"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">Kata Sandi</label>
                        <button
                          type="button"
                          onClick={() => { setForgotPasswordMode(true); setForgotEmail(email); }}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >Lupa sandi?</button>
                      </div>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type={showPw ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 mt-1"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>Masuk ke Akun <ArrowRight size={16} /></>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </ShineBorder>

          {/* Forgot Password Modal */}
          <AnimatePresence>
            {forgotPasswordMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={() => { setForgotPasswordMode(false); setForgotSuccess(false); }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {forgotSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Email Terkirim!</h3>
                      <p className="text-sm text-slate-500 mb-6">Link reset password sudah dikirim ke <strong>{forgotEmail}</strong>. Cek inbox Anda.</p>
                      <button
                        onClick={() => { setForgotPasswordMode(false); setForgotSuccess(false); }}
                        className="w-full py-3 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
                      >Tutup</button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Lupa Kata Sandi?</h3>
                      <p className="text-sm text-slate-500 mb-5">Masukkan email Anda dan kami akan mengirimkan link untuk reset kata sandi.</p>
                      <div className="space-y-4">
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="email"
                            placeholder="nama@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all text-sm"
                          />
                        </div>
                        <button
                          onClick={handleForgotPassword}
                          disabled={forgotLoading}
                          className="w-full py-3 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                          {forgotLoading ? <Loader2 size={16} className="animate-spin" /> : <>Kirim Link Reset <ArrowRight size={16} /></>}
                        </button>
                        <button
                          onClick={() => { setForgotPasswordMode(false); setForgotSuccess(false); }}
                          className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-all"
                        >Batal</button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Register Link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Ingin ikut kompetisi?{" "}
            <Link href="/daftar" className="font-semibold text-purple-600 hover:underline">
              Daftar Kompetisi →
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 🌟 SISTEM NOTIFIKASI TOAST (MENGAMBANG DI POJOK KANAN ATAS) */}
      {/* ========================================================= */}
      <div className={`fixed top-8 right-8 z-[100] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-2xl p-4 flex items-center gap-3">
          {toast.type === 'success' ? (
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-800 text-sm">{toast.type === 'success' ? 'Berhasil' : 'Akses Ditolak'}</p>
            <p className="text-xs text-slate-500 font-medium max-w-[250px] leading-relaxed">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
