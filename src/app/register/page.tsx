"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShineBorder } from "@/components/ui/ShineBorder";
import { registerLocalUser } from "@/app/actions/auth";
import { getSystemSettings } from "@/lib/localAuth";
import {
  Mail, Lock, Eye, EyeOff, Loader2, Trophy,
  User, Building2, ArrowRight, CheckCircle2, BookOpen, Mic, Medal, AlertCircle, X
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { icon: BookOpen, label: "Olimpiade MIPA", color: "text-blue-500 bg-blue-50", border: "border-blue-100" },
  { icon: Mic, label: "Speech Contest", color: "text-emerald-500 bg-emerald-50", border: "border-emerald-100" },
  { icon: Medal, label: "LKTI Nasional", color: "text-yellow-500 bg-yellow-50", border: "border-yellow-100" },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [npsn, setNpsn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [regOpen, setRegOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const settings = getSystemSettings();
    setRegOpen(settings.registrationOpen);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOpen) return;
    if (!agreed) { setError("Harap setujui Syarat & Ketentuan terlebih dahulu."); return; }
    if (password.length < 6) { setError("Kata sandi minimal 6 karakter."); return; }

    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 700));

    const formData = new FormData();
    formData.append("username", email.split('@')[0]);
    formData.append("fullName", fullName);
    formData.append("school", school);
    formData.append("npsn", npsn.trim());
    formData.append("email", email);
    formData.append("password", password);

    const result = await registerLocalUser(formData);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } else {
      setError(result.error ?? "Terjadi kesalahan.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20">

      {/* ─── LEFT: Branding ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-16 bg-gradient-to-br from-purple-700 via-indigo-700 to-indigo-800">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-white w-full max-w-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-white/10 border border-white/20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
          >
            <Trophy size={38} className="text-yellow-300 drop-shadow-lg" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bergabung Bersama Kami
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-indigo-200 text-base leading-relaxed mb-10"
          >
            Buat akun untuk mengakses dashboard peserta, pantau status pendaftaran, dan kelola pengumpulan dokumen.
          </motion.p>

          {/* Category showcase */}
          <div className="flex flex-col gap-3">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
                className="flex items-center gap-4 bg-white/10 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <cat.icon size={20} className="text-white/80" />
                </div>
                <span className="font-medium">{cat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
              <Trophy size={20} className="text-yellow-300" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">NCC 13th</div>
              <div className="text-xs text-slate-500">National Creativity Competition</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Buat Akun Peserta ✨
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
              Masuk di sini
            </Link>
          </p>

          {!regOpen ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="p-10 bg-white border border-rose-100 rounded-[3rem] text-center shadow-xl shadow-rose-500/5"
            >
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Pendaftaran Ditutup</h3>
               <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Maaf, pendaftaran akun baru saat ini sedang ditutup oleh panitia. Silakan hubungi admin untuk info lebih lanjut.</p>
               <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Kembali ke Beranda</Link>
            </motion.div>
          ) : (
            <ShineBorder
              colors={["#9333ea", "#6366f1", "#ec4899", "#9333ea"]}
              duration={6}
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
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5 }}
                        className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle2 size={36} className="text-emerald-500" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-slate-900">Akun Berhasil Dibuat! 🎉</h3>
                      <p className="text-sm text-slate-500">Mengarahkan ke dashboard...</p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                      exit={{ opacity: 0 }}
                    >
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-2 p-3.5 text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl"
                          >
                            <span>⚠️</span> {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Full Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all text-sm"
                            placeholder="Nama lengkap Anda" />
                        </div>
                      </div>

                      {/* School */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Asal Sekolah / Instansi</label>
                        <div className="relative">
                          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type="text" required value={school} onChange={(e) => setSchool(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all text-sm"
                            placeholder="SMA Negeri 1 ..." />
                        </div>
                      </div>

                      {/* NPSN / Kode Sekolah */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-sm font-medium text-slate-700">NPSN / Kode Sekolah</label>
                          <span className="text-[10px] text-slate-400 font-medium">Bisa angka & huruf (Opsional)</span>
                        </div>
                        <div className="relative">
                          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type="text" value={npsn} onChange={(e) => setNpsn(e.target.value.toUpperCase())} maxLength={30}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all text-sm uppercase font-mono font-medium"
                            placeholder="Contoh: 20101456 atau SMAN1" />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all text-sm"
                            placeholder="nama@email.com" />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input type={showPw ? "text" : "password"} required value={password}
                            onChange={(e) => setPassword(e.target.value)} minLength={6}
                            className="block w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all text-sm"
                            placeholder="Min. 6 karakter" />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="flex items-start gap-2.5">
                        <input id="terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                        <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                          Saya setuju dengan{" "}
                          <a href="#" className="text-indigo-600 hover:underline font-medium">Syarat & Ketentuan</a>
                          {" "}dan{" "}
                          <a href="#" className="text-indigo-600 hover:underline font-medium">Kebijakan Privasi</a>
                          {" "}NCC 13th.
                        </label>
                      </div>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-200/50"
                      >
                        {loading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>Buat Akun Peserta <ArrowRight size={16} /></>
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </ShineBorder>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Sudah terdaftar? Mau daftar kompetisi?{" "}
            <Link href="/daftar" className="font-semibold text-purple-600 hover:underline">
              Form Pendaftaran →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
