'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { 
  LayoutGrid, Users, BadgeCheck, Megaphone, 
  Calendar, Image as ImageIcon, Server, Settings,
  LogOut, UserCircle, ShieldCheck, BellRing, Database, Clock, Loader2, Trophy,
  Power, XCircle, CheckCircle2, Trash2, AlertCircle, Plus, CheckCircle, FileText, Pencil, X, Save
} from 'lucide-react';

export default function SettingsDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [strictMode, setStrictMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [entryCount, setEntryCount] = useState<number | null>(null);
  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; waveId: number | null; waveName: string }>({ open: false, waveId: null, waveName: '' });
  // Editing wave name state
  const [editingWaveName, setEditingWaveName] = useState<{ id: number | null; value: string }>({ id: null, value: '' });

  // States for unified registration settings
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [waves, setWaves] = useState<any[]>([]);
  const [portalSettingsData, setPortalSettingsData] = useState<any>(null);
  const [paymentRequirementStage, setPaymentRequirementStage] = useState('registration');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // States for Custom Payment Info (Bank, Rekening, Nominal, Deskripsi)
  const [paymentConfig, setPaymentConfig] = useState({
    bankName: "Bank Mandiri",
    bankBadge: "MANDIRI",
    accountNumber: "123-456-789-0123",
    accountHolder: "Panitia National Creativity Competition",
    amount: 150000,
    amountFormatted: "Rp 150.000",
    description: "Untuk mengaktifkan kepesertaan Anda di cabang {category}, silakan lakukan transfer administrasi pendaftaran:"
  });
  const [isSavingPaymentConfig, setIsSavingPaymentConfig] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntryCount = async () => {
      const { count } = await supabase
        .from('competition_entries')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setEntryCount(count);
    };
    fetchEntryCount();
  }, []);

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
            console.log(`[Admin Settings] Sesi admin valid: ${currentEmail} (percobaan ${attempt})`);
            return; // ✅ Sesi valid
          }
          
          if (error) console.warn(`[Admin Settings] Auth error percobaan ${attempt}:`, error.message);
          else console.warn(`[Admin Settings] Tidak ada sesi (percobaan ${attempt}). Email: ${currentEmail || 'tidak ada'}`);
          
          if (hasAdminCookie && attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
          }
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
        } catch (err) {
          console.error(`[Admin Settings] Exception percobaan ${attempt}:`, err);
          if (attempt < 3) { await new Promise(r => setTimeout(r, 1500)); continue; }
        }
      }
      console.log("[Admin Settings] Tidak ada sesi valid setelah 3 percobaan. Redirect ke login.");
      router.push('/login');
    };

    const fetchSettings = async () => {
      try {
        await ensureAdminSession();
        const { data: cbtData, error: cbtErr } = await supabase.from('cbt_settings').select('*').eq('id', 1).single();
        if (cbtErr) {
          console.error("Gagal memuat cbt_settings:", cbtErr);
          setLoadError(`cbt_settings: ${cbtErr.message} (Code: ${cbtErr.code})`);
        } else if (cbtData) {
          setStrictMode(cbtData.strict_mode);
          setAutoSave(cbtData.auto_save);
          setMaintenance(cbtData.maintenance_mode);
        }

        const { data: siteData, error: siteErr } = await supabase.from('site_settings').select('result_visible').eq('id', 1).single();
        if (siteErr) {
          console.error("Gagal memuat site_settings:", siteErr);
          setLoadError(prev => prev ? `${prev} | site_settings: ${siteErr.message}` : `site_settings: ${siteErr.message} (Code: ${siteErr.code})`);
        } else if (siteData) {
          setResultVisible(siteData.result_visible ?? false);
        }

        const { data: portalData, error: portalErr } = await supabase.from('announcements').select('*').eq('title', 'SYS_PORTAL_SETTINGS').single();
        if (portalErr) {
          console.error("Gagal memuat announcements:", portalErr);
          setLoadError(prev => prev ? `${prev} | portal_settings: ${portalErr.message}` : `portal_settings: ${portalErr.message} (Code: ${portalErr.code})`);
        } else if (portalData) {
          setPortalSettingsData(portalData);
          try {
            const parsed = JSON.parse(portalData.content);
            if (parsed.isRegistrationOpen !== undefined) setIsRegistrationOpen(parsed.isRegistrationOpen);
            if (parsed.waves) setWaves(parsed.waves);
            if (parsed.paymentRequirementStage !== undefined) setPaymentRequirementStage(parsed.paymentRequirementStage);
          } catch (e) {
            console.error("Gagal parsing portal settings:", e);
          }
        }

        // Ambil konfigurasi rekening & deskripsi pembayaran
        try {
          const { getPaymentConfig } = await import('@/app/actions/auth');
          const pRes = await getPaymentConfig();
          if (pRes && pRes.data) {
            setPaymentConfig(pRes.data);
          }
        } catch (pErr) {
          console.error("Gagal memuat payment config:", pErr);
        }
      } catch (err: any) {
        console.error("Gagal memuat pengaturan:", err);
        setLoadError(err.message || "Unknown error during fetch");
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setToastMessage("");

    try {
      // 1. Validasi Input Gelombang (Cegah Tanggal Kosong / Data Loss)
      const hasEmptyDates = waves.some(w => !w.startDate || !w.endDate);
      if (hasEmptyDates) {
        throw new Error("Semua gelombang wajib memiliki Tanggal Mulai dan Tanggal Selesai!");
      }

      // 2. Simpan pengaturan CBT
      const { error: cbtError } = await supabase.from('cbt_settings').update({
        strict_mode: strictMode,
        auto_save: autoSave,
        maintenance_mode: maintenance,
        updated_at: new Date().toISOString()
      }).eq('id', 1);

      if (cbtError) throw cbtError;

      // 3. Simpan status result, gate register & server maintenance ke site_settings
      const { error: siteError } = await supabase.from('site_settings').update({
        result_visible: resultVisible,
        is_registration_open: isRegistrationOpen,
        maintenance_mode: maintenance
      }).eq('id', 1);

      if (siteError) throw siteError;

      // 4. Simpan status portal (Gerbang Pendaftaran & Waves) ke announcements
      // Inisialisasi ID dan konten teraktual
      let activeContent = portalSettingsData?.content;
      let activeId = portalSettingsData?.id;
      
      if (!activeId) {
        const { data: existing } = await supabase
          .from('announcements')
          .select('id, content')
          .eq('title', 'SYS_PORTAL_SETTINGS')
          .maybeSingle();
        if (existing) {
          activeId = existing.id;
          activeContent = existing.content;
        }
      }

      let parsed = { isRegistrationOpen: isRegistrationOpen, waves: waves, paymentRequirementStage: paymentRequirementStage };
      if (activeContent) {
        try {
          parsed = { ...parsed, ...JSON.parse(activeContent) };
          parsed.waves = waves;
          parsed.isRegistrationOpen = isRegistrationOpen;
          parsed.paymentRequirementStage = paymentRequirementStage;
        } catch (e) {}
      }
      const newContent = JSON.stringify(parsed);

      if (activeId) {
        const { data: uData, error: pErr } = await supabase
          .from('announcements')
          .update({ content: newContent })
          .eq('id', activeId)
          .select()
          .single();
        if (pErr) throw pErr;
        if (uData) setPortalSettingsData(uData);
      } else {
        const { data: iData, error: pErr } = await supabase
          .from('announcements')
          .insert([{
            title: 'SYS_PORTAL_SETTINGS',
            content: newContent,
            target_audience: 'All'
          }])
          .select()
          .single();
        if (pErr) throw pErr;
        if (iData) setPortalSettingsData(iData);
      }

      // Berhasil
      setToastMessage("Semua pengaturan berhasil disinkronisasi ke server!");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err: any) {
      console.error("Gagal menyimpan pengaturan:", err);
      setToastMessage(`Gagal menyimpan: ${err.message}`);
      setTimeout(() => setToastMessage(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePaymentStage = async (newStage: string) => {
    // 1. Optimistic UI update
    setPaymentRequirementStage(newStage);
    setToastMessage(`Kewajiban Pembayaran diatur ke: ${
      newStage === 'registration' ? 'Awal Pendaftaran' :
      newStage === 'tahap1' ? 'Lolos Tahap 1' :
      newStage === 'tahap2' ? 'Lolos Tahap 2' : 'Bebas Biaya'
    }`);
    setTimeout(() => setToastMessage(""), 3000);

    try {
      let parsed = { isRegistrationOpen: isRegistrationOpen, waves: waves, paymentRequirementStage: newStage };
      if (portalSettingsData) {
        try {
          parsed = { ...parsed, ...JSON.parse(portalSettingsData.content) };
          parsed.paymentRequirementStage = newStage;
        } catch(e) {}
      }
      
      const newContent = JSON.stringify(parsed);
      
      // Deteksi ID yang ada untuk melakukan update, jika tidak ada baru insert
      let activeId = portalSettingsData?.id;
      if (!activeId) {
        const { data: existing } = await supabase
          .from('announcements')
          .select('id')
          .eq('title', 'SYS_PORTAL_SETTINGS')
          .maybeSingle();
        if (existing) activeId = existing.id;
      }

      let error = null;
      let updatedData = null;

      if (activeId) {
        const { data: uData, error: uErr } = await supabase
          .from('announcements')
          .update({ content: newContent })
          .eq('id', activeId)
          .select()
          .single();
        error = uErr;
        updatedData = uData;
      } else {
        const { data: iData, error: iErr } = await supabase
          .from('announcements')
          .insert([{
            title: 'SYS_PORTAL_SETTINGS',
            content: newContent,
            target_audience: 'All'
          }])
          .select()
          .single();
        error = iErr;
        updatedData = iData;
      }
      
      if (error) {
        console.error("Gagal menyimpan tahap pembayaran:", error);
        setToastMessage(`Gagal menyimpan ke database: ${error.message}`);
        setTimeout(() => setToastMessage(""), 4000);
      } else if (updatedData) {
        setPortalSettingsData(updatedData);
      }
    } catch (e: any) {
      console.error(e);
      setToastMessage(`Gagal memproses: ${e.message}`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Toggle result langsung tanpa perlu klik Simpan
  const handleToggleResult = async (newValue: boolean) => {
    const { error } = await supabase.from('site_settings').update(
      { result_visible: newValue }
    ).eq('id', 1);
    if (error) {
      console.error("Gagal menyimpan status pengumuman:", error);
      setToastMessage(`Gagal menyimpan: ${error.message}`);
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setResultVisible(newValue);
      setToastMessage(newValue ? "Sistem hasil kelulusan AKTIF — peserta dapat melihat status." : "Sistem hasil kelulusan DIMATIKAN — pengumuman disembunyikan.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleLogout = async () => {
    // Auto-save sebelum logout agar data tidak hilang
    const hasEmptyDates = waves.some(w => !w.startDate || !w.endDate);
    if (!hasEmptyDates) {
      try {
        await handleSave();
      } catch (e) {
        console.error("Gagal auto-save saat logout", e);
      }
    } else {
      const confirmed = window.confirm("Ada gelombang dengan tanggal yang masih kosong sehingga tidak bisa disimpan. Tetap keluar dan hilangkan perubahan yang belum disimpan?");
      if (!confirmed) return;
    }

    try { await supabase.auth.signOut(); } catch (_) {}
    try {
      const { logoutLocalUser } = await import("@/app/actions/auth");
      await logoutLocalUser();
    } catch (_) {
      router.push('/login');
    }
  };

  // Toggle Gerbang Pendaftaran langsung
  const handleToggleRegistration = async (newValue: boolean) => {
    // 1. Optimistic UI update
    setIsRegistrationOpen(newValue);
    setToastMessage(newValue ? "Gerbang pendaftaran BERHASIL DIBUKA!" : "Gerbang pendaftaran DITUTUP SEMENTARA.");
    setTimeout(() => setToastMessage(""), 3000);

    try {
      let parsed = { isRegistrationOpen: newValue, waves: waves, paymentRequirementStage: paymentRequirementStage };
      if (portalSettingsData) {
        try {
          parsed = { ...parsed, ...JSON.parse(portalSettingsData.content) };
          parsed.isRegistrationOpen = newValue;
        } catch(e) {}
      }
      
      const newContent = JSON.stringify(parsed);

      // Deteksi ID yang ada untuk melakukan update, jika tidak ada baru insert
      let activeId = portalSettingsData?.id;
      if (!activeId) {
        const { data: existing } = await supabase
          .from('announcements')
          .select('id')
          .eq('title', 'SYS_PORTAL_SETTINGS')
          .maybeSingle();
        if (existing) activeId = existing.id;
      }

      let error = null;
      let updatedData = null;

      if (activeId) {
        const { data: uData, error: uErr } = await supabase
          .from('announcements')
          .update({ content: newContent })
          .eq('id', activeId)
          .select()
          .single();
        error = uErr;
        updatedData = uData;
      } else {
        const { data: iData, error: iErr } = await supabase
          .from('announcements')
          .insert([{
            title: 'SYS_PORTAL_SETTINGS',
            content: newContent,
            target_audience: 'All'
          }])
          .select()
          .single();
        error = iErr;
        updatedData = iData;
      }
      
      if (error) {
        console.error("Gagal menyimpan gerbang pendaftaran:", error);
        // Revert on error
        setIsRegistrationOpen(!newValue);
        setToastMessage(`Gagal menyimpan ke database: ${error.message}`);
        setTimeout(() => setToastMessage(""), 4000);
      } else if (updatedData) {
        setPortalSettingsData(updatedData);
        // Sync with site_settings table as well
        await supabase
          .from('site_settings')
          .update({ is_registration_open: newValue })
          .eq('id', 1);
      }
    } catch (e: any) {
      console.error(e);
      setIsRegistrationOpen(!newValue);
      setToastMessage(`Gagal memproses: ${e.message}`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  const toggleWaveStatus = (id: number) => {
    setWaves(prev => prev.map(w => 
      w.id === id 
        ? { ...w, status: w.status === 'Aktif' ? 'Tutup' : 'Aktif' } 
        : w
    ));
  };

  const confirmDeleteWave = (wave: any) => {
    setDeleteConfirm({ open: true, waveId: wave.id, waveName: wave.name });
  };

  const executeDeleteWave = () => {
    if (deleteConfirm.waveId === null) return;
    setWaves(prev => prev.filter(w => w.id !== deleteConfirm.waveId));
    setToastMessage(`${deleteConfirm.waveName} berhasil dihapus.`);
    setTimeout(() => setToastMessage(''), 3000);
    setDeleteConfirm({ open: false, waveId: null, waveName: '' });
  };

  const startEditName = (wave: any) => {
    setEditingWaveName({ id: wave.id, value: wave.name });
  };

  const saveEditName = async (waveId: number) => {
    const trimmed = editingWaveName.value.trim();
    if (!trimmed) return;
    const updatedWaves = waves.map(w => w.id === waveId ? { ...w, name: trimmed } : w);
    setWaves(updatedWaves);
    setEditingWaveName({ id: null, value: '' });
    // Persist to database immediately
    try {
      let activeId = portalSettingsData?.id;
      let activeContent = portalSettingsData?.content;
      if (!activeId) {
        const { data: existing } = await supabase.from('announcements').select('id, content').eq('title', 'SYS_PORTAL_SETTINGS').maybeSingle();
        if (existing) { activeId = existing.id; activeContent = existing.content; }
      }
      let parsed: any = { isRegistrationOpen, waves: updatedWaves, paymentRequirementStage };
      if (activeContent) {
        try { parsed = { ...parsed, ...JSON.parse(activeContent) }; parsed.waves = updatedWaves; } catch (e) {}
      }
      if (activeId) {
        const { data: uData } = await supabase.from('announcements').update({ content: JSON.stringify(parsed) }).eq('id', activeId).select().single();
        if (uData) setPortalSettingsData(uData);
        setToastMessage(`Nama gelombang berhasil diubah menjadi "${trimmed}"!`);
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (e: any) {
      setToastMessage(`Gagal menyimpan nama gelombang: ${e.message}`);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const addWave = async () => {
    const newId = (waves.length > 0 ? Math.max(...waves.map((w: any) => w.id)) : 0) + 1;
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    const newName = `Gelombang ${romanNumerals[newId] || newId}`;
    const newWave = { id: newId, name: newName, status: 'Tutup', startDate: '', endDate: '' };
    const updatedWaves = [...waves, newWave];
    setWaves(updatedWaves);
    setToastMessage(`Gelombang "${newName}" berhasil ditambahkan! Klik Simpan Perubahan untuk menyimpan ke database.`);
    setTimeout(() => setToastMessage(''), 4000);
  };


  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-gray-800">
      
      {/* 1. SIDEBAR (Konsisten) */}
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
          
          <Link href="/hq?tab=Peserta" className="flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <div className="flex items-center space-x-3">
               <Users className="w-5 h-5" />
               <span>Buku Peserta</span>
            </div>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-full">{entryCount ?? '...'}</span>
          </Link>
          
          <Link href="/hq?tab=Verifikasi" className="flex items-center justify-between px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-all font-semibold text-sm">
            <div className="flex items-center space-x-3">
               <BadgeCheck className="w-5 h-5" />
               <span>Verifikasi Berkas</span>
            </div>
            <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full">0</span>
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

          {/* ACTIVE MENU: Pengaturan */}
          <Link href="/hq/settings" className="flex items-center space-x-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-md shadow-slate-200 transition-all font-semibold text-sm">
            <Settings className="w-5 h-5 text-indigo-400" />
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
            <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Pengaturan Sistem</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold mt-0.5">Konfigurasi pusat infrastruktur NCC 13th.</p>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center">
               {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               Simpan Perubahan
             </button>
          </div>
        </header>

        {/* CONTENT */}
        {loadError && (
          <div className="mx-6 md:mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-red-800 text-sm">Gagal Sinkronisasi dengan Database</h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">{loadError}</p>
              <p className="text-[10px] text-red-500 mt-2 font-medium">Langkah perbaikan: Pastikan tabel Supabase di atas memiliki RLS yang di-disable atau memiliki policy yang memperbolehkan akses read/write.</p>
            </div>
          </div>
        )}

        {isLoadingSettings ? (
          <div className="p-6 md:p-8 space-y-6 max-w-5xl flex-1 animate-pulse">
            {/* Profile Card Skeleton */}
            <div className="bg-white rounded-[24px] border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-3 w-full">
                <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-1/4"></div>
                <div className="h-10 bg-slate-100 rounded-lg w-full mt-4"></div>
              </div>
            </div>

            {/* Portal Card Skeleton */}
            <div className="bg-white rounded-[24px] p-8 border border-gray-100 space-y-4">
              <div className="h-6 bg-slate-100 rounded-lg w-1/4"></div>
              <div className="h-4 bg-slate-100 rounded-lg w-2/3"></div>
              <div className="h-14 bg-slate-100 rounded-xl w-full"></div>
            </div>

            {/* Payment Stage Skeleton */}
            <div className="bg-white rounded-[24px] p-8 border border-gray-100 space-y-6">
              <div className="space-y-2">
                <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-2xl p-5"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-5xl flex-1">
          
          {/* Bagian Profil Institusi & Admin */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center border-4 border-white shadow-md flex-shrink-0">
               <UserCircle className="w-12 h-12 text-indigo-400" />
            </div>
            <div className="flex-1 space-y-4 w-full text-center md:text-left">
              <div>
                <h3 className="text-xl font-black text-gray-900">Muhammad Luthfi Aziz</h3>
                <p className="text-sm font-bold text-indigo-600 mt-1">Super Admin NCC 13th</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50 text-left">
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institusi</p>
                   <p className="text-sm font-semibold text-gray-700 mt-0.5">SMA Darul Ulum 1 Jombang</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role Akses</p>
                   <p className="text-sm font-semibold text-gray-700 mt-0.5">Full System Override</p>
                 </div>
              </div>
            </div>
          </div>

          {/* 1. SAKLAR UTAMA PORTAL */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isRegistrationOpen 
                    ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100' 
                    : 'bg-rose-100 text-rose-600 shadow-lg shadow-rose-100'
                }`}>
                  <Power size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Gerbang Pendaftaran</h3>
                  <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Status saat ini:</span>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest inline-flex items-center gap-1.5 ${isRegistrationOpen ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                      {isRegistrationOpen ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {isRegistrationOpen ? 'TERBUKA UNTUK PUBLIK' : 'DITUTUP SEMENTARA'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Toggle Switch Modern */}
              <button 
                onClick={() => {
                  handleToggleRegistration(!isRegistrationOpen);
                }}
                className={`relative w-20 h-10 rounded-full transition-colors duration-300 focus:outline-none shadow-inner shrink-0 ${
                  isRegistrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-1 left-1 bg-white w-8 h-8 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                  isRegistrationOpen ? 'translate-x-10' : 'translate-x-0'
                }`}>
                  {isRegistrationOpen 
                    ? <CheckCircle2 size={16} className="text-emerald-500" /> 
                    : <XCircle size={16} className="text-slate-400" />
                  }
                </div>
              </button>
            </div>

            {/* Peringatan saat ditutup */}
            {!isRegistrationOpen && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-500 mt-0.5 shrink-0" />
                <p className="text-sm text-rose-700">
                  <strong>Perhatian:</strong> Peserta baru tidak dapat mendaftar saat portal ditutup. 
                  Peserta yang sudah mendaftar tetap bisa login dan melihat status mereka.
                </p>
              </div>
            )}
          </div>

          {/* 1.5. KONFIGURASI KEWAJIBAN PEMBAYARAN */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100 space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">Kewajiban Pembayaran Lomba</h3>
              <p className="text-sm text-slate-500 mt-1">Tentukan pada fase/tahap mana peserta diwajibkan untuk menyelesaikan administrasi pembayaran.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'registration',
                  title: 'Awal Pendaftaran',
                  desc: 'Peserta wajib membayar langsung setelah mendaftar biodata untuk mengaktifkan akun.',
                  badge: 'Tahap Awal',
                  color: 'indigo'
                },
                {
                  id: 'tahap1',
                  title: 'Lolos Tahap 1',
                  desc: 'Peserta mendaftar gratis. Pembayaran hanya ditagih jika peserta dinyatakan lolos Babak Penyisihan (Tahap 1).',
                  badge: 'Semi-Finalis',
                  color: 'blue'
                },
                {
                  id: 'tahap2',
                  title: 'Lolos Tahap 2',
                  desc: 'Pembayaran hanya ditagih jika peserta berhasil lolos Babak Semi Final (Tahap 2) menuju Grand Final.',
                  badge: 'Finalis',
                  color: 'purple'
                },
                {
                  id: 'free',
                  title: 'Bebas Biaya (Gratis)',
                  desc: 'Pendaftaran sepenuhnya gratis untuk seluruh peserta tanpa ada pungutan biaya apapun.',
                  badge: 'Bebas Administrasi',
                  color: 'emerald'
                }
              ].map((stage) => {
                const isActive = paymentRequirementStage === stage.id;
                return (
                  <motion.button
                    key={stage.id}
                    onClick={() => handleUpdatePaymentStage(stage.id)}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    className={`text-left p-5 rounded-2xl border-2 transition-all flex flex-col justify-between h-full relative overflow-hidden group ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/10 shadow-md shadow-indigo-50/50'
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activePaymentStage"
                        className="absolute inset-0 bg-indigo-50/20 pointer-events-none"
                        style={{ border: "2px solid #4f46e5", borderRadius: "14px" }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                    <div className="w-full flex justify-between items-start gap-4 relative z-10">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2.5 ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {stage.badge}
                        </span>
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                          {stage.title}
                        </h4>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isActive 
                          ? 'border-indigo-600 bg-indigo-600 text-white' 
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}>
                        {isActive && <CheckCircle2 size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3 relative z-10">
                      {stage.desc}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {/* 💳 KUSTOMISASI REKENING & DESKRIPSI PEMBAYARAN */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    Pengaturan Rekening & Deskripsi Tagihan Peserta
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Sesuaikan nomor rekening, nama bank, nominal, dan instruksi yang tampil di dashboard peserta.</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50/40 to-slate-50/70 p-6 rounded-2xl border border-indigo-100/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Nama Bank</label>
                    <input 
                      type="text" 
                      value={paymentConfig.bankName} 
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, bankName: e.target.value, bankBadge: e.target.value.split(" ")[1]?.toUpperCase() || e.target.value.toUpperCase() }))}
                      placeholder="Contoh: Bank Mandiri" 
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Nomor Rekening</label>
                    <input 
                      type="text" 
                      value={paymentConfig.accountNumber} 
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Contoh: 123-456-789-0123" 
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Atas Nama (A.N.)</label>
                    <input 
                      type="text" 
                      value={paymentConfig.accountHolder} 
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, accountHolder: e.target.value }))}
                      placeholder="Contoh: Panitia National Creativity Competition" 
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Biaya / Nominal (Rp)</label>
                    <input 
                      type="number" 
                      value={paymentConfig.amount} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPaymentConfig(prev => ({ 
                          ...prev, 
                          amount: val,
                          amountFormatted: `Rp ${val.toLocaleString('id-ID')}`
                        }));
                      }}
                      placeholder="150000" 
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Instruksi / Deskripsi Singkat <span className="text-slate-400 font-normal">(Gunakan {"{category}"} untuk nama cabang)</span>
                    </label>
                    <input 
                      type="text" 
                      value={paymentConfig.description} 
                      onChange={(e) => setPaymentConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Untuk mengaktifkan kepesertaan Anda di cabang {category}, silakan transfer:" 
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={async () => {
                      setIsSavingPaymentConfig(true);
                      try {
                        const { savePaymentConfig } = await import('@/app/actions/auth');
                        const res = await savePaymentConfig(paymentConfig);
                        if (res.error) throw new Error(res.error);
                        setToastMessage("Pengaturan rekening & deskripsi pembayaran berhasil disimpan!");
                        setTimeout(() => setToastMessage(""), 3000);
                      } catch (err: any) {
                        setToastMessage(`Gagal: ${err.message}`);
                        setTimeout(() => setToastMessage(""), 3500);
                      } finally {
                        setIsSavingPaymentConfig(false);
                      }
                    }}
                    disabled={isSavingPaymentConfig}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingPaymentConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan Rincian Pembayaran
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* ── MANAJEMEN GELOMBANG PENDAFTARAN ─────────────────────────── */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">Manajemen Gelombang Pendaftaran</h3>
                <p className="text-sm text-slate-500 mt-1">Edit nama gelombang pendaftaran. Perubahan nama akan tersinkronisasi ke seluruh sistem secara real-time.</p>
              </div>
              <button
                onClick={addWave}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shrink-0"
              >
                <Plus size={14} /> Tambah Gelombang
              </button>
            </div>

            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : waves.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                <div className="text-4xl mb-3">🌊</div>
                <p className="font-bold text-gray-500">Belum ada gelombang pendaftaran.</p>
                <p className="text-xs text-gray-400 mt-1">Klik tombol "Tambah Gelombang" untuk memulai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waves.map((wave: any) => (
                  <div key={wave.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 group hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all">
                    {/* Wave ID Badge */}
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                      {wave.id}
                    </div>

                    {/* Wave Name - Editable */}
                    <div className="flex-1 min-w-0">
                      {editingWaveName.id === wave.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingWaveName.value}
                            onChange={(e) => setEditingWaveName({ id: wave.id, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditName(wave.id); if (e.key === 'Escape') setEditingWaveName({ id: null, value: '' }); }}
                            className="flex-1 px-3 py-1.5 text-sm font-bold border-2 border-indigo-400 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            autoFocus
                          />
                          <button onClick={() => saveEditName(wave.id)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                            <Save size={14} />
                          </button>
                          <button onClick={() => setEditingWaveName({ id: null, value: '' })} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{wave.name}</span>
                          <button
                            onClick={() => startEditName(wave)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit nama gelombang"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                      {wave.startDate && wave.endDate && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(wave.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} – {new Date(wave.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                      wave.status === 'Aktif' 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${wave.status === 'Aktif' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {wave.status === 'Aktif' ? 'Aktif' : 'Tutup'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleWaveStatus(wave.id)}
                        title={wave.status === 'Aktif' ? 'Tutup gelombang' : 'Aktifkan gelombang'}
                        className={`p-2 rounded-lg text-xs font-bold transition-all ${
                          wave.status === 'Aktif'
                            ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {wave.status === 'Aktif' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                      </button>
                      <button
                        onClick={() => confirmDeleteWave(wave)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                        title="Hapus gelombang"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {waves.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">
                  <strong>Tips:</strong> Edit nama gelombang langsung tersimpan ke database. Perubahan status gelombang (Aktif/Tutup) akan disimpan saat Anda klik tombol <strong>"Simpan Perubahan"</strong> di bagian atas.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bagian Keamanan CBT */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><ShieldCheck className="w-5 h-5" /></div>
                <h3 className="text-base font-black text-gray-800">Keamanan Ujian (CBT)</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Strict Fullscreen Mode</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 w-4/5">Siswa otomatis log out jika menekan Alt+Tab atau keluar layar.</p>
                </div>
                <button 
                  onClick={async () => {
                    const nextVal = !strictMode;
                    const { error } = await supabase.from('cbt_settings').update({
                      strict_mode: nextVal,
                      auto_save: autoSave,
                      maintenance_mode: maintenance,
                      updated_at: new Date().toISOString()
                    }).eq('id', 1);
                    if (error) {
                      setToastMessage(`Gagal menyimpan: ${error.message}`);
                      setTimeout(() => setToastMessage(""), 4000);
                    } else {
                      setStrictMode(nextVal);
                      setToastMessage(`Strict Fullscreen Mode ${nextVal ? 'AKTIF' : 'DIMATIKAN'}!`);
                      setTimeout(() => setToastMessage(""), 3000);
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center flex-shrink-0 ${strictMode ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${strictMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Auto-Save Telemetry</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 w-4/5">Simpan jawaban ke database setiap kali siswa memilih opsi.</p>
                </div>
                <button 
                  onClick={async () => {
                    const nextVal = !autoSave;
                    const { error } = await supabase.from('cbt_settings').update({
                      strict_mode: strictMode,
                      auto_save: nextVal,
                      maintenance_mode: maintenance,
                      updated_at: new Date().toISOString()
                    }).eq('id', 1);
                    if (error) {
                      setToastMessage(`Gagal menyimpan: ${error.message}`);
                      setTimeout(() => setToastMessage(""), 4000);
                    } else {
                      setAutoSave(nextVal);
                      setToastMessage(`Auto-Save Telemetry ${nextVal ? 'AKTIF' : 'DIMATIKAN'}!`);
                      setTimeout(() => setToastMessage(""), 3000);
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center flex-shrink-0 ${autoSave ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${autoSave ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </div>

            {/* Bagian Sistem Server */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Database className="w-5 h-5" /></div>
                <h3 className="text-base font-black text-gray-800">Status Server Infrastruktur</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">Mode Pemeliharaan (Maintenance)</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 w-4/5">Tutup akses login siswa sementara waktu.</p>
                </div>
                <button 
                  onClick={async () => {
                    const nextVal = !maintenance;
                    const { error } = await supabase.from('cbt_settings').update({
                      strict_mode: strictMode,
                      auto_save: autoSave,
                      maintenance_mode: nextVal,
                      updated_at: new Date().toISOString()
                    }).eq('id', 1);
                    if (!error) {
                      // Sync with site_settings table as well
                      await supabase
                        .from('site_settings')
                        .update({ maintenance_mode: nextVal })
                        .eq('id', 1);
                    }
                    if (error) {
                      setToastMessage(`Gagal menyimpan: ${error.message}`);
                      setTimeout(() => setToastMessage(""), 4000);
                    } else {
                      setMaintenance(nextVal);
                      setToastMessage(nextVal ? "Mode Pemeliharaan (Maintenance) AKTIF!" : "Mode Pemeliharaan (Maintenance) DIMATIKAN.");
                      setTimeout(() => setToastMessage(""), 3000);
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center flex-shrink-0 ${maintenance ? 'bg-rose-500 animate-pulse' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${maintenance ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-4">
                 <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Zona Waktu Server</label>
                   <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 outline-none">
                     <option>Waktu Indonesia Barat (WIB)</option>
                     <option>Waktu Indonesia Tengah (WITA)</option>
                     <option>Waktu Indonesia Timur (WIT)</option>
                   </select>
                 </div>
              </div>
            </div>
          </div>

          {/* ── Toggle Sistem Hasil Kelulusan ─────────────────────────────── */}
          <div className={`rounded-[24px] border-2 p-8 transition-all ${
            resultVisible
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-gray-100 shadow-sm'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  resultVisible ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-800">Portal Pengumuman Hasil Kelulusan</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1 max-w-lg leading-relaxed">
                    Kontrol visibilitas halaman <strong>Live Ranking &amp; Cek Kelulusan</strong> untuk peserta.
                    Saat <span className="text-emerald-600 font-bold">AKTIF</span>, peserta dapat memasukkan NISN dan melihat status kelulusan mereka.
                    Saat <span className="text-rose-500 font-bold">MATI</span>, halaman menampilkan pesan bahwa pengumuman belum tersedia.
                  </p>
                  <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    resultVisible
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      resultVisible ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                    }`} />
                    {resultVisible ? 'Sistem Aktif — Peserta Dapat Cek Status' : 'Sistem Mati — Pengumuman Disembunyikan'}
                  </div>
                </div>
              </div>
              {/* Toggle Switch besar */}
              <button
                onClick={() => handleToggleResult(!resultVisible)}
                className={`relative flex-shrink-0 w-16 h-8 rounded-full transition-all duration-300 focus:outline-none ${
                  resultVisible ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  resultVisible ? 'translate-x-9' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

        </div>
        )}
      </main>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-slate-900/20 flex items-center space-x-3 animate-in slide-in-from-bottom-5 fade-in duration-300 border border-slate-700">
          <BadgeCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ✨ CUSTOM DELETE CONFIRM MODAL */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={() => setDeleteConfirm({ open: false, waveId: null, waveName: '' })}
          />
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative z-10 bg-white/95 backdrop-blur-xl border border-white shadow-2xl shadow-slate-950/20 rounded-[28px] p-8 max-w-sm w-full text-center"
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner shadow-rose-200/50">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Gelombang?</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-2">
              Anda akan menghapus
            </p>
            <p className="text-sm font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 mb-6 inline-block">
              {deleteConfirm.waveName}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Aksi ini tidak dapat dibatalkan. Peserta yang sudah terdaftar pada periode ini tidak akan terpengaruh.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, waveId: null, waveName: '' })}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteWave}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all active:scale-95 hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>

  );
}
