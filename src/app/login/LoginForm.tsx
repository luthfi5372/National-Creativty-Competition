"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginLocalUser } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🚀 [Auth-Form] Memulai proses otentikasi...");
    
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailInput = formData.get("email")?.toString().trim() || "";
    const password = formData.get("password")?.toString() || "";

    // Step 1: Server action — validasi, self-healing, resolve username → email
    const result = await loginLocalUser(formData);

    if (result.success) {
      // Set hint cookies for consistency
      document.cookie = "ncc_hint=1; path=/; max-age=604800; samesite=lax";
      if (result.isAdmin) {
        document.cookie = "ncc_admin_hint=1; path=/; max-age=604800; samesite=lax";
      }

      // Step 2: ✅ Sign in dari sisi BROWSER agar Supabase session tersimpan di cookies browser
      // Server action tidak bisa set browser session dengan benar — ini fix utama!
      if (!result.isAdmin) {
        try {
          const supabase = createClient();
          const loginEmail = result.resolvedEmail || emailInput;
          console.log("[Auth-Form] Signing in on browser client with:", loginEmail);
          const { error: clientError } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: password,
          });
          if (clientError) {
            console.error("[Auth-Form] Client-side signIn failed:", clientError.message);
            // Jangan lempar error — server action sudah konfirmasi valid, mungkin tinggal redirect
          } else {
            console.log("[Auth-Form] Browser session established successfully!");
          }
        } catch (clientErr) {
          console.error("[Auth-Form] Client signIn exception:", clientErr);
        }
      }

      setTimeout(() => {
        if (result.isAdmin) {
          window.location.href = '/hq'; 
        } else {
          window.location.href = '/dashboard';
        }
      }, 500);
    } else {
      const errorMsg = result.error ?? "Terjadi kesalahan.";
      setError(errorMsg);
      setIsLoading(false);
      alert("❌ GAGAL MASUK: " + errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl">
          <span className="text-red-400">⚠️</span> {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Alamat Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Mail size={16} className="text-slate-400" />
          </div>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm shadow-sm"
            placeholder="nama@email.com"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Kata Sandi
          </label>
          <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            Lupa sandi?
          </a>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Lock size={16} className="text-slate-400" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm shadow-sm"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="remember-me" className="text-sm text-slate-600">
          Ingat saya
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100 mt-1"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Masuk ke Akun"}
      </button>
    </form>
  );
}
