"use client";

import { User, Mail, Lock, Type, ArrowRight, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { syncEntryOnDaftar } from "@/app/actions/auth";

export default function DaftarPage() {
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    npsn: "",
    school: ""
  });
  const [isSchoolLocked, setIsSchoolLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { getSession } = require("@/lib/localAuth");
      if (getSession()) {
        router.push("/dashboard");
      }
    }
  }, [router]);

  // Efek Pencarian NPSN Sekolah (Auto-Lock & Sync)
  useEffect(() => {
    const lookupNpsn = async () => {
      const code = formData.npsn.trim();
      if (code.length >= 3) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('school')
            .ilike('npsn', code)
            .not('school', 'is', null)
            .neq('school', '')
            .limit(1);

          if (data && data.length > 0 && data[0].school) {
            setFormData(prev => ({ ...prev, school: data[0].school }));
            setIsSchoolLocked(true);
            return;
          }
        } catch (e) {
          console.error("Gagal mendeteksi sekolah berdasarkan NPSN:", e);
        }
      }
      setIsSchoolLocked(false);
    };

    lookupNpsn();
  }, [formData.npsn, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validasi Keamanan Dasar
    if (!formData.username || !formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.school) {
      setError("⚠️ Semua kolom wajib diisi, Komandan!");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("⚠️ Kata sandi dan konfirmasinya tidak cocok!");
      return;
    }
    if (formData.password.length < 6) {
      setError("⚠️ Kata sandi minimal harus 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      // 2. Tembakkan Data ke Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
            npsn: formData.npsn.trim(),
            school: formData.school,
            custom_password: formData.password, // Save plain text password
          }
        }
      });

      if (authError) throw authError;

      // 2.b Link competition_entries and sync custom password in database immediately
      if (data?.user) {
        await syncEntryOnDaftar(formData.email, data.user.id, formData.password, formData.npsn.trim(), formData.school);
      }

      // 3. Tampilkan Efek Sukses Premium
      setSubmitted(true);
      
      // Tunggu sebentar agar user melihat animasi sukses, lalu lempar ke login
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error: any) {
      setError(`❌ Pendaftaran Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 font-sans">
        {/* --- Ornamen Background Liquid Glass --- */}
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[550px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl p-12 text-center relative z-10"
        >
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Akun Berhasil Dibuat!</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-8 text-sm">
            Selamat datang di NCC. Silakan masuk dengan akun baru Anda untuk mengakses dashboard.
          </p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5 }}
              className="h-full bg-emerald-500"
             />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 font-sans">
      {/* --- Ornamen Background Liquid Glass --- */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* --- Kartu Form Utama --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[550px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl p-8 md:p-10 relative z-10"
      >
        
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 shadow-sm">
            ✨ National Creativity Competition
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Daftar Akun</h1>
          <p className="text-slate-500 text-sm font-medium">Buat akun baru untuk mengakses dashboard pendaftaran dan kompetisi NCC.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Baris 1: Username & Nama Lengkap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="username_peserta" 
                  autoComplete="new-username"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Nama Lengkap</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Type size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="Nama Lengkap Anda" 
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Baris 2: Email & NPSN Sekolah */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Alamat Email Aktif</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="email" 
                  placeholder="nama@email.com" 
                  autoComplete="new-email"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NPSN / Kode Sekolah</label>
                <span className="text-[9px] text-slate-400 font-medium">Bisa huruf & angka</span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="Contoh: 20101456 atau SMAN1" 
                  maxLength={30}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm uppercase font-mono font-medium"
                  value={formData.npsn}
                  onChange={(e) => setFormData({...formData, npsn: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
          </div>

          {/* Baris 2.5: Nama Sekolah */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center pl-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Sekolah</label>
              {isSchoolLocked && (
                <span className="text-[9px] text-amber-600 font-extrabold flex items-center gap-1 uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-full animate-pulse border border-amber-500/20">
                  <Lock size={10} /> Terkunci (Registrasi NPSN Pertama)
                </span>
              )}
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                {isSchoolLocked ? (
                  <Lock size={16} className="text-amber-500 transition-colors" />
                ) : (
                  <Building2 size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                )}
              </div>
              <input 
                type="text" 
                readOnly={isSchoolLocked}
                placeholder="Nama Sekolah Anda (misal: SMA Negeri 1 Jakarta)" 
                autoComplete="off"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all shadow-sm ${
                  isSchoolLocked 
                    ? "bg-slate-100/80 border-slate-300/80 text-slate-500 font-semibold cursor-not-allowed select-none focus:ring-amber-500/20 focus:border-amber-500" 
                    : "bg-white/60 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/50 focus:border-blue-500"
                }`}
                value={formData.school}
                onChange={(e) => setFormData({...formData, school: e.target.value})}
              />
            </div>
          </div>

          {/* Baris 3: Password & Konfirmasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Kata Sandi</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Konfirmasi</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>DAFTAR SEKARANG <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Sudah Memiliki Akun? <Link href="/login" className="text-blue-600 font-extrabold hover:text-blue-700 hover:underline transition-all">Masuk Saja</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
