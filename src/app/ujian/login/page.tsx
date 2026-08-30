'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { generateTicketCode } from '@/lib/utils';
import { 
  Ticket, 
  Key, 
  ArrowRight,
  ShieldAlert,
  BadgeCheck,
  Loader2
} from 'lucide-react';

import { getTokenSettings, getActiveExams } from '@/app/actions/auth';

export default function ParticipantLogin() {
  const router = useRouter();
  const supabase = createClient();

  // State: pakai ID Tiket (misal: NCC-1990) bukan NISN
  const [ticketInput, setTicketInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<{ title: string; desc: string } | null>(null);

  // ⚙️ Token Settings State
  const [tokenSettings, setTokenSettings] = useState<{
    tokenEnabled: boolean;
    tokenIntervalMinutes: number;
    isTokenPaused: boolean;
    pausedAt?: number | null;
  }>({
    tokenEnabled: true,
    tokenIntervalMinutes: 10,
    isTokenPaused: false,
    pausedAt: null
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load token settings & listen for realtime updates
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getTokenSettings();
        if (res && res.data) {
          setTokenSettings({
            tokenEnabled: res.data.tokenEnabled ?? true,
            tokenIntervalMinutes: Number(res.data.tokenIntervalMinutes) || 10,
            isTokenPaused: Boolean(res.data.isTokenPaused),
            pausedAt: res.data.pausedAt || null
          });
        }
      } catch (err) {
        console.error("Gagal memuat token settings via Server Action:", err);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();

    // Poll every 30 seconds for token settings changes (saves Supabase realtime connection quota)
    const poll = setInterval(loadSettings, 30000);

    return () => {
      clearInterval(poll);
    };
  }, []);

  // Normalisasi input: hilangkan prefix "NCC-" jika ada, ambil kode alfanumeriknya
  const parseTicketNumber = (raw: string): string => {
    return raw.trim().toUpperCase().replace(/^NCC[-\s]*/i, '').trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { authenticateParticipantServer } = await import('@/app/actions/auth');
      const res = await authenticateParticipantServer(ticketInput, tokenInput);

      if (!res.success || !res.user) {
        setErrorMsg({
          title: res.errorTitle || 'Gagal Masuk',
          desc: res.errorDesc || 'Data pendaftar atau token tidak valid.'
        });
        setLoading(false);
        return;
      }

      localStorage.setItem('ncc_user', JSON.stringify(res.user));
      router.push('/ujian/dashboard');
    } catch (err: any) {
      setErrorMsg({ title: 'Gangguan Server', desc: err.message || 'Gagal terhubung ke pusat data. Lapor ke panitia.' });
      setLoading(false);
    }
  };

  // Format input: auto-prefix "NCC-" saat user mengetik kode
  const handleTicketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // Jika user hapus semua, biarkan kosong
    if (val === '' || val === 'NCC' || val === 'NCC-') {
      setTicketInput(val);
      return;
    }
    // Jika user belum ketik prefix, tambahkan otomatis
    if (!val.startsWith('NCC-')) {
      val = 'NCC-' + val.replace(/^NCC[-\s]*/i, '');
    }
    // Batasi panjang: "NCC-" (4) + 6 karakter alfanumerik = 10 karakter total
    if (val.length <= 10) setTicketInput(val);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white p-10 rounded-[40px] shadow-[0_10px_40px_rgb(0,0,0,0.04)] relative">
        
        {/* LOGO HEADER */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-[#5145cd] rounded-full mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-5 relative">
             <span className="text-white font-black text-4xl tracking-tighter">N</span>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
               <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
             </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Portal Peserta NCC</h1>
          <p className="text-[9px] text-gray-400 mt-2 font-black uppercase tracking-widest">National Creativity Competition 13th</p>
        </div>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-rose-700">{errorMsg.title}</h3>
              <p className="text-[10px] text-rose-600/80 mt-1 font-semibold leading-relaxed">{errorMsg.desc}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          {/* ── FIELD 1: ID TIKET (pengganti NISN) ── */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-2 flex items-center justify-between">
              <span>ID Tiket Peserta</span>
              <span className="text-[8px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full normal-case font-bold">
                Contoh: NCC-A3X7Q2
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Ticket className="h-5 w-5 text-[#5145cd]" />
              </div>
              <input
                id="ticket-input"
                type="text"
                required
                value={ticketInput}
                onChange={handleTicketChange}
                placeholder="NCC-XXXXXX"
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-[20px] text-base tracking-[0.18em] font-black focus:bg-white focus:ring-2 focus:ring-[#5145cd]/20 focus:border-[#5145cd] transition-all outline-none text-[#5145cd] placeholder-indigo-200 uppercase"
              />
            </div>
            <p className="text-[9px] text-gray-400 font-semibold mt-1.5 ml-2">
              ID Tiket tertera di kartu peserta atau konfirmasi panitia. (6 karakter)
            </p>
          </div>

          {/* ── FIELD 2: TOKEN UJIAN LIVE (HANYA DITAMPILKAN JIKA TOKEN DIAKTIFKAN ADMIN) ── */}
          {tokenSettings.tokenEnabled && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-2 flex items-center justify-between">
                <span>Token Ujian (Live)</span>
                <span className="text-[8px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-bold">
                  {tokenSettings.isTokenPaused 
                    ? '⏸️ Token Terjeda' 
                    : `Berubah tiap ${tokenSettings.tokenIntervalMinutes || 10} mnt`}
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-[#5145cd]" />
                </div>
                <input
                  id="token-input"
                  type="text"
                  required={tokenSettings.tokenEnabled}
                  maxLength={6}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="••••••"
                  autoComplete="off"
                  className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-[20px] text-lg tracking-[0.3em] font-black focus:bg-white focus:ring-2 focus:ring-[#5145cd]/20 focus:border-[#5145cd] transition-all outline-none text-[#5145cd] placeholder-indigo-200 uppercase"
                />
              </div>
            </div>
          )}

          {/* ── TOMBOL MASUK ── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-[#5145cd] hover:bg-[#3d32a8] active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-[20px] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memvalidasi...
              </span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center text-[9px] font-black text-emerald-500 uppercase tracking-widest">
           <BadgeCheck className="w-4 h-4 mr-1.5" />
           Sistem Keamanan Berlapis Aktif
        </div>
      </div>
    </div>
  );
}
