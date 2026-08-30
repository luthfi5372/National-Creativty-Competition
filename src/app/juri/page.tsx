"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  LogOut,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { fetchJuryEntries, fetchEntryScores } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "SEMUA",
  "Olimpiade MIPA",
  "Speech Contest",
  "LKTI Nasional",
  "MTQ Nasional"
];

export default function JuryDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const JURI_EMAILS = [
    "luthfi5372@gmail.com",
    "admin@ncc.id",
    "admin1@ncc.id",
    "halo.ncc@gmail.com",
    "juri@ncc.id",
    "evaluator@ncc.id"
  ];

  async function loadData() {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    // 🛡️ SECURITY GUARD: Only authorized judges!
    if (!supabaseUser || authError) {
      router.replace('/login');
      return;
    }
    
    if (!JURI_EMAILS.includes(supabaseUser.email || "")) {
      alert("⛔ AKSES DITOLAK! Anda bukan Juri resmi NCC.");
      router.replace('/dashboard');
      return;
    }

    setUser(supabaseUser);

    const catParam = selectedCategory === "SEMUA" ? undefined : selectedCategory;
    const { data } = await fetchJuryEntries(catParam);
    
    if (data) {
      // Check which entries have already been scored by THIS judge
      const entriesWithScores = await Promise.all(data.map(async (entry) => {
        const { data: scores } = await fetchEntryScores(entry.id);
        const myScore = scores?.find(s => s.juri_email === supabaseUser?.email);
        return { ...entry, myScore };
      }));
      setEntries(entriesWithScores);
    }
    setIsLoading(false);
  }

  const filteredEntries = entries.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.school.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">JURY PORTAL</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">NCC 13th Evaluation System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-white/80">{user?.email?.split('@')[0]}</span>
              <span className="text-[9px] text-indigo-400 uppercase font-black tracking-widest">Authorized Judge</span>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <LogOut size={18} className="text-white/60 group-hover:text-white" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4 tracking-tighter"
          >
            Selamat Bertugas, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 italic">Judge.</span>
          </motion.h2>
          <p className="text-white/40 max-w-2xl font-medium">
            Silakan pilih kategori kompetisi dan mulai lakukan penilaian terhadap karya-karya peserta yang telah terverifikasi.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === cat 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Cari Peserta / Sekolah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/5 hover:border-white/10 focus:border-indigo-500/50 outline-none rounded-2xl py-3 pl-12 pr-6 text-sm font-medium w-full md:w-64 transition-all"
                />
             </div>
             <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                >
                  <ListIcon size={18} />
                </button>
             </div>
          </div>
        </div>

        {/* Entries Grid */}
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
              ))
            ) : filteredEntries.length > 0 ? (
              filteredEntries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative overflow-hidden flex flex-col p-8 rounded-[2rem] border transition-all duration-500 ${
                    entry.myScore 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-white/[0.02] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                      entry.myScore 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {entry.myScore ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {entry.myScore ? "Telah Dinilai" : "Menunggu Penilaian"}
                    </div>
                    {entry.myScore && (
                      <div className="text-2xl font-black text-emerald-400 leading-none tabular-nums">
                        {entry.myScore.total_score}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                      {entry.full_name}
                    </h3>
                    <p className="text-white/40 text-xs font-bold mb-4 flex items-center gap-2">
                       <GraduationCap size={14} className="text-indigo-500" />
                       {entry.school}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-6">
                       <div className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black text-white/60 uppercase tracking-tighter border border-white/5">
                          {entry.category}
                       </div>
                    </div>
                  </div>

                  <Link
                    href={`/juri/eval/${entry.id}`}
                    className={`flex items-center justify-between w-full p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      entry.myScore 
                        ? "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white" 
                        : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
                    }`}
                  >
                    {entry.myScore ? "Edit Penilaian" : "Mulai Penilaian"}
                    <ChevronRight size={16} />
                  </Link>

                  {/* Glass Grain Effect Overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
                <AlertCircle size={48} className="text-white/10 mb-4" />
                <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-xs">Tidak ada peserta yang ditemukan</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5 text-center mt-20">
         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">
           NCC 13th Autonomous Evaluation System — Secure Layer
         </p>
      </footer>
    </div>
  );
}
