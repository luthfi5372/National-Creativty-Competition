'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutGrid, Users, BadgeCheck, Megaphone, 
  Calendar, Image as ImageIcon, Server, Settings,
  LogOut, ShieldCheck, Clock, Search, Loader2, MoreVertical, FileText,
  CheckCircle2, XCircle, AlertCircle, MapPin, Trophy
} from 'lucide-react';

export default function ParticipantsBook() {
  const router = useRouter();
  const supabase = createClient();
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [entryCount, setEntryCount] = useState<number | null>(null);

  useEffect(() => {
    // 🛡️ CLIENT-SIDE AUTH CHECK dengan retry logic (anti false-positive logout)
    const ensureAdminSession = async () => {
      const adminEmails = ["admin@ncc.id", "admin1@ncc.id", "halo.ncc@gmail.com"];
      const hasAdminCookie = document.cookie.includes('ncc_admin_hint=1');
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          const currentEmail = user?.email?.toLowerCase();
          
          if (user && adminEmails.includes(currentEmail || "")) {
            console.log(`[Admin Participants] Sesi admin valid: ${currentEmail} (percobaan ${attempt})`);
            return; // ✅ Sesi valid
          }
          
          if (error) console.warn(`[Admin Participants] Auth error percobaan ${attempt}:`, error.message);
          else console.warn(`[Admin Participants] Tidak ada sesi (percobaan ${attempt}). Email: ${currentEmail || 'tidak ada'}`);
          
          if (hasAdminCookie && attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
          }
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
        } catch (err) {
          console.error(`[Admin Participants] Exception percobaan ${attempt}:`, err);
        }
      }

      if (hasAdminCookie) {
        console.log("[Admin Participants] Sesi admin diverifikasi via cookie ncc_admin_hint.");
        return;
      }

      console.log("[Admin Participants] Tidak ada sesi valid setelah 3 percobaan. Redirect ke login.");
      router.push('/login');
    };

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('competition_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setParticipants(data);
      if (error) console.error('Gagal mengambil data peserta:', error);
      setLoading(false);
    };

    const fetchEntryCount = async () => {
      const { count } = await supabase
        .from('competition_entries')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setEntryCount(count);
    };

    const initialize = async () => {
      await ensureAdminSession();
      fetchParticipants();
      fetchEntryCount();
    };

    initialize();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) {}
    try {
      const { logoutLocalUser } = await import("@/app/actions/auth");
      await logoutLocalUser();
    } catch (_) {
      router.push('/login');
    }
  };

  const categories = ['All', 'Olimpiade MIPA', 'Speech Contest', 'LKTI Nasional', 'MTQ Nasional'];
  const statusOptions = ['All', 'Unpaid', 'Pending', 'Verified', 'Rejected'];

  const filteredParticipants = participants.filter(p => {
    const matchSearch = 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nisn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.province?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'All' || p.competition_type === filterCategory;
    const matchStatus = filterStatus === 'All' || p.payment_status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const getWaveName = (entry: any) => {
    if (entry.notes) {
      try {
        const n = JSON.parse(entry.notes);
        if (n.registered_wave) return n.registered_wave.split(' (')[0];
      } catch (e) {}
    }
    return 'Gelombang 1';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-100"><CheckCircle2 size={10} /> VERIFIED</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"><Clock size={10} /> PENDING</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100"><XCircle size={10} /> REJECTED</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-600 border border-slate-200"><AlertCircle size={10} /> UNPAID</span>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Olimpiade MIPA': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Speech Contest': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'LKTI Nasional': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'MTQ Nasional': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-gray-800">
      
      {/* 1. SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col fixed h-full z-20">
        <div className="p-6 flex items-center space-x-3 mt-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200/50">
            <ShieldCheck className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-gray-900 leading-none">NCC HQ.</h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Command Center</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <Link href="/hq" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <LayoutGrid className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          
          {/* ACTIVE MENU: Buku Peserta */}
          <Link href="/hq/participants" className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-xl shadow-md shadow-slate-200 transition-all font-semibold text-sm">
            <div className="flex items-center space-x-3">
               <Users className="w-5 h-5 text-indigo-400" />
               <span>Buku Peserta</span>
            </div>
            <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{entryCount ?? '...'}</span>
          </Link>
          
          <Link href="/hq?tab=Verifikasi" className="flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <div className="flex items-center space-x-3">
               <BadgeCheck className="w-5 h-5" />
               <span>Verifikasi Berkas</span>
            </div>
          </Link>
          
          <Link href="/hq/llms/broadcast" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <Megaphone className="w-5 h-5" />
            <span>Siaran Info</span>
          </Link>
          
          <Link href="/hq?tab=Kegiatan" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <Calendar className="w-5 h-5" />
            <span>Kegiatan</span>
          </Link>

          <Link href="/hq?tab=Timeline" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <Calendar className="w-5 h-5" />
            <span>Kelola Timeline Lomba</span>
          </Link>

          <Link href="/hq?tab=Schedule" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <FileText className="w-5 h-5" />
            <span>Kelola Halaman Depan</span>
          </Link>
          
          <Link href="/hq?tab=Media" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <ImageIcon className="w-5 h-5" />
            <span>Kelola Media</span>
          </Link>
          
          <Link href="/hq/llms" className="flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5" />
              <span>Manajemen LLMS</span>
            </div>
          </Link>

          <Link href="/hq/settings" className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm">
            <LogOut className="w-5 h-5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        
        {/* HEADER TOP BAR */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 md:px-8 py-5 flex justify-between items-center border-b border-gray-100">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Buku Peserta Lomba</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold mt-0.5">
              Database pendaftar lomba NCC 13th — Total: <span className="text-indigo-600">{entryCount ?? '...'} peserta</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/hq" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all">
              Kembali ke Dashboard
            </Link>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-6 md:p-8 space-y-6 flex-1">
          
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-[16px] text-sm font-semibold text-gray-800 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="Cari nama, email, NISN, sekolah, provinsi..."
              />
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto flex-wrap">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'Semua Kategori' : c}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {statusOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'Semua Status' : s}</option>)}
              </select>
            </div>
          </div>

          {/* STATS MINI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Pendaftar', value: entryCount ?? '...', color: 'indigo', icon: <Users size={18} /> },
              { label: 'Terverifikasi', value: participants.filter(p => p.payment_status === 'Verified').length, color: 'green', icon: <CheckCircle2 size={18} /> },
              { label: 'Menunggu', value: participants.filter(p => p.payment_status === 'Pending').length, color: 'amber', icon: <Clock size={18} /> },
              { label: 'Belum Bayar', value: participants.filter(p => !p.payment_status || p.payment_status === 'Unpaid').length, color: 'slate', icon: <AlertCircle size={18} /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-500 animate-pulse">Memuat data peserta lomba...</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <Users className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-black text-gray-700">Tidak ada data ditemukan</h3>
                <p className="text-sm font-medium text-gray-400 mt-1 max-w-sm">
                  {participants.length === 0 
                    ? 'Belum ada peserta yang mendaftar.'
                    : `Tidak ada hasil yang cocok dengan pencarian "${searchTerm}" atau filter yang dipilih.`
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                      <th className="py-5 px-6 font-black">#</th>
                      <th className="py-5 px-6 font-black">Informasi Peserta</th>
                      <th className="py-5 px-6 font-black">Asal Sekolah</th>
                      <th className="py-5 px-6 font-black">Kategori Lomba</th>
                      <th className="py-5 px-6 font-black">Gelombang</th>
                      <th className="py-5 px-6 font-black text-center">Status Bayar</th>
                      <th className="py-5 px-6 font-black text-right">Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {filteredParticipants.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="py-4 px-6 text-gray-400 text-xs font-bold">{idx + 1}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-black text-xs uppercase border border-indigo-200/50 shrink-0">
                              {p.full_name?.substring(0, 2) || '??'}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{p.full_name || 'Peserta Anonim'}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{p.email || '-'}</p>
                              {p.nisn && <p className="text-[10px] font-mono text-gray-400">NISN: {p.nisn}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-gray-700">{p.school_name || p.school || '-'}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {p.province || '-'}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(p.competition_type)}`}>
                            {p.competition_type || 'Belum Dipilih'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                            <Trophy size={10} /> {getWaveName(p)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(p.payment_status)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <p className="text-xs font-semibold text-gray-500">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {p.created_at ? new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer count */}
                <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400">
                    Menampilkan <span className="text-gray-700">{filteredParticipants.length}</span> dari <span className="text-gray-700">{participants.length}</span> peserta
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
