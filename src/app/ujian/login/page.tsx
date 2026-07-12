'use client';

import { useState } from 'react';
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

export default function ParticipantLogin() {
  const router = useRouter();
  const supabase = createClient();

  // State: pakai ID Tiket (misal: NCC-1990) bukan NISN
  const [ticketInput, setTicketInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<{ title: string; desc: string } | null>(null);

  // Normalisasi input: hilangkan prefix "NCC-" jika ada, ambil kode alfanumeriknya
  const parseTicketNumber = (raw: string): string => {
    return raw.trim().toUpperCase().replace(/^NCC[-\s]*/i, '').trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // ─── LANGKAH 1: Ambil semua peserta dari DB ───────────────
      // Sistem mengambil seluruh data dan mencocokkan ID Tiket secara lokal
      // untuk menghindari query tidak aman berbasis input langsung user.
      const { data: allEntries, error: fetchError } = await supabase
        .from('competition_entries')
        .select('*');

      if (fetchError || !allEntries) {
        setErrorMsg({ title: 'Gagal Terhubung', desc: 'Gagal membaca data peserta. Coba lagi atau hubungi panitia.' });
        setLoading(false); return;
      }

      // ─── LANGKAH 2: Cocokkan ID Tiket yang diinput ────────────
      // generateTicketCode menghasilkan 6 karakter alfanumerik dari ID peserta
      // Contoh: NCC-A3X7Q2 → "A3X7Q2" → dicocokkan ke generateTicketCode(entry.id)
      const inputTicketNum = parseTicketNumber(ticketInput);

      const matchedUser = allEntries.find((entry) => {
        let customId = "";
        if (entry.notes) {
          try {
            const notesObj = JSON.parse(entry.notes);
            if (notesObj.custom_ticket_id) {
              customId = notesObj.custom_ticket_id.replace(/^NCC-/i, "").trim().toUpperCase();
            }
          } catch (e) {}
        }
        return generateTicketCode(entry.id) === inputTicketNum || customId === inputTicketNum;
      });

      if (!matchedUser) {
        setErrorMsg({
          title: 'ID Tiket Tidak Ditemukan',
          desc: `Tidak ada peserta dengan ID Tiket "NCC-${inputTicketNum}". Cek kembali tiket Anda atau hubungi panitia.`
        });
        setLoading(false); return;
      }

      // ─── LANGKAH 3: Cek Cabang Lomba ──────────────────────────
      const kolomCabang = matchedUser.competition_type || matchedUser.branch;
      if (kolomCabang && !kolomCabang.toLowerCase().includes('mipa')) {
        setErrorMsg({
          title: 'Akses Ditolak',
          desc: `Akun ini terdaftar di cabang ${kolomCabang}. Portal LLMS eksklusif untuk Olimpiade MIPA.`
        });
        setLoading(false); return;
      }

      // ─── LANGKAH 4: Cek Status Verifikasi & Kebutuhan Pembayaran ─────────────────────
      let paymentRequirementStage = 'registration';
      const { data: portalData } = await supabase
        .from('announcements')
        .select('*')
        .eq('title', 'SYS_PORTAL_SETTINGS')
        .maybeSingle();

      if (portalData && portalData.content) {
        try {
          const parsed = JSON.parse(portalData.content);
          if (parsed.paymentRequirementStage) {
            paymentRequirementStage = parsed.paymentRequirementStage;
          }
        } catch (e) {}
      }

      // Deteksi stage dan status kelulusan dari notes
      let currentStage = 1;
      let isFailed = false;
      if (matchedUser.notes) {
        try {
          const notesObj = JSON.parse(matchedUser.notes);
          if (notesObj.current_stage) currentStage = Number(notesObj.current_stage);
          if (notesObj.is_failed) isFailed = Boolean(notesObj.is_failed);
        } catch (e) {}
      }

      // Cek apakah peserta dinyatakan tidak lolos
      if (isFailed) {
        setErrorMsg({
          title: 'Akses Ujian Ditutup',
          desc: 'Maaf, Anda dinyatakan tidak lolos ke babak berikutnya.'
        });
        setLoading(false); return;
      }

      // Cek apakah wajib bayar di tahap ini
      let isPaymentRequired = true;
      if (paymentRequirementStage === 'registration') {
        isPaymentRequired = true;
      } else if (paymentRequirementStage === 'tahap1') {
        isPaymentRequired = currentStage >= 2;
      } else if (paymentRequirementStage === 'tahap2') {
        isPaymentRequired = currentStage >= 3;
      } else if (paymentRequirementStage === 'free') {
        isPaymentRequired = false;
      }

      if (isPaymentRequired && matchedUser.payment_status !== 'Verified') {
        setErrorMsg({
          title: 'Peserta Belum Diverifikasi',
          desc: `Status pendaftaran masih "${matchedUser.payment_status}". Selesaikan verifikasi pembayaran terlebih dahulu.`
        });
        setLoading(false); return;
      }

      // ─── LANGKAH 5: Ambil Sesi Ujian Aktif ───────────────────
      const { data: exams, error: examsError } = await supabase
        .from('cbt_exams')
        .select('id, title')
        .eq('is_active', true);

      if (examsError || !exams || exams.length === 0) {
        setErrorMsg({ title: 'Tidak Ada Ujian Aktif', desc: 'Panitia belum membuka sesi ujian apapun saat ini.' });
        setLoading(false); return;
      }

      // ─── LANGKAH 6: Validasi Rolling Token (10 Menit) ────────
      const now = Math.floor(Date.now() / 1000);
      const interval10Min = 600;
      const currentInterval = Math.floor(now / interval10Min);
      const charPool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      let matchedExam = null;
      const userToken = tokenInput.toUpperCase().trim();

      // Toleransi perbedaan waktu (clock drift) ±10 menit dengan mengecek 3 interval: sekarang, sebelumnya, dan berikutnya
      const targetIntervals = [currentInterval, currentInterval - 1, currentInterval + 1];

      for (const exam of exams) {
        let isMatched = false;
        
        for (const interval of targetIntervals) {
          let expectedToken = "";
          let idSum = 5381;
          for (let i = 0; i < exam.id.length; i++) {
            idSum = ((idSum * 33) ^ exam.id.charCodeAt(i)) >>> 0;
          }
          let seed = (idSum + interval) % 10000;
          for (let i = 0; i < 6; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            expectedToken += charPool[Math.floor((seed / 233280) * charPool.length)];
          }

          if (userToken === expectedToken) {
            isMatched = true;
            break;
          }
        }

        if (isMatched) {
          matchedExam = exam;
          break;
        }
      }

      if (!matchedExam) {
        setErrorMsg({
          title: 'Token Ujian Tidak Valid',
          desc: 'Token salah atau sudah kedaluwarsa. Lihat token terbaru di layar pengawas.'
        });
        setLoading(false); return;
      }

      // ─── LANGKAH 7: Sukses! Simpan sesi dan masuk ────────────
      localStorage.setItem('ncc_user', JSON.stringify({
        ...matchedUser,
        active_exam_id: matchedExam.id,
        active_exam_title: matchedExam.title,
        // Simpan ID Tiket yang sudah terverifikasi untuk referensi
        ticket_code: `NCC-${generateTicketCode(matchedUser.id)}`
      }));
      router.push('/ujian/dashboard');

    } catch (err) {
      setErrorMsg({ title: 'Gangguan Server', desc: 'Gagal terhubung ke pusat data. Lapor ke panitia.' });
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

          {/* ── FIELD 2: TOKEN UJIAN LIVE ── */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 ml-2 flex items-center justify-between">
              <span>Token Ujian (Live)</span>
              <span className="text-[8px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full">Berubah tiap 10 mnt</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-[#5145cd]" />
              </div>
              <input
                id="token-input"
                type="text"
                required
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="••••••"
                autoComplete="off"
                className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-[20px] text-lg tracking-[0.3em] font-black focus:bg-white focus:ring-2 focus:ring-[#5145cd]/20 focus:border-[#5145cd] transition-all outline-none text-[#5145cd] placeholder-indigo-200"
              />
            </div>
          </div>

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
