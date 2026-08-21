'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { generateTicketCode } from "@/lib/utils";
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckBadgeIcon,
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  FunnelIcon,
  UserCircleIcon,
  BuildingLibraryIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

type TabFilter = 'all' | 'active' | 'blocked' | 'done';

interface ExamInfo {
  title: string;
  token: string;
  duration_minutes: number;
}

interface Participant {
  id: string;
  user_id: string;
  exam_id: string;
  status?: string | null;
  submitted_at?: string | null;
  started_at?: string;
  updated_at: string;
  violations_count: number;
  current_score?: number;
  // Enriched from cbt_participants
  full_name?: string;
  school_origin?: string;
  branch?: string;
}

export default function LiveMonitor() {
  const params = useParams();
  const examId = params?.exam_id as string;

  const supabase = createClient();

  const [examInfo, setExamInfo] = useState<ExamInfo>({ title: 'Memuat...', token: '...', duration_minutes: 90 });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantMap, setParticipantMap] = useState<Record<string, { full_name: string; school_origin: string; branch: string }>>({});
  const [stats, setStats] = useState({ working: 0, submitted: 0, cheating: 0 });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [now, setNow] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tick setiap detik untuk timer
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const recalcStats = useCallback((list: Participant[]) => {
    let w = 0, s = 0, c = 0;
    list.forEach(p => {
      const done = p.status === 'submitted';
      if (done) s++; else w++;
      if ((p.violations_count >= 3) && !done) c++;
    });
    setStats({ working: w, submitted: s, cheating: c });
  }, []);

  const fetchData = useCallback(async () => {
    if (!examId || examId === 'undefined') return;
    setIsRefreshing(true);
    try {
      const { getCbtMonitorData } = await import('@/app/actions/auth');
      const { exam, attempts, entries, profiles, error } = await getCbtMonitorData(examId);

      if (exam) {
        setExamInfo({
          title: exam.title || 'Sesi CBT',
          token: exam.token || '-',
          duration_minutes: exam.duration_minutes || 90
        });
      }

      // Build comprehensive participant mapping
      const pMap: Record<string, any> = {};

      (entries || []).forEach((entry: any) => {
        let customTicketCode = "";
        if (entry.notes) {
          try {
            const notesObj = JSON.parse(entry.notes);
            if (notesObj.custom_ticket_id) {
              customTicketCode = notesObj.custom_ticket_id.toUpperCase();
            }
          } catch (e) {}
        }
        
        const generatedTicketCode = `NCC-${generateTicketCode(entry.id)}`.toUpperCase();
        
        const info = {
          full_name: entry.full_name || "Peserta NCC",
          school_origin: entry.school_name || entry.school || "-",
          branch: entry.competition_type || entry.category || ""
        };

        // Map by generated ticket code
        pMap[generatedTicketCode] = info;
        pMap[generatedTicketCode.replace("NCC-", "")] = info;

        // Map by custom ticket code if available
        if (customTicketCode) {
          pMap[customTicketCode] = info;
          pMap[customTicketCode.replace("NCC-", "")] = info;
        }

        // Map by user_id
        if (entry.user_id) {
          pMap[String(entry.user_id).toUpperCase()] = info;
          pMap[String(entry.user_id).toLowerCase()] = info;
        }

        // Map by nisn
        if (entry.nisn) {
          pMap[String(entry.nisn)] = info;
        }

        // Map by email
        if (entry.email) {
          pMap[String(entry.email).toLowerCase()] = info;
        }
      });

      (profiles || []).forEach((prof: any) => {
        if (prof.id && !pMap[prof.id]) {
          pMap[prof.id] = {
            full_name: prof.full_name || "Peserta",
            school_origin: prof.school_name || "-",
            branch: ""
          };
        }
      });

      setParticipantMap(pMap);

      if (attempts) {
        setParticipants(attempts);
        recalcStats(attempts);
      }
    } catch (err: any) {
      console.error("Gagal memuat data CCTV:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [examId, recalcStats]);

  useEffect(() => {
    if (!examId || examId === 'undefined') return;

    fetchData();

    // 📡 1. Realtime postgres_changes listener
    const channel = supabase.channel(`live-cctv-${examId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cbt_attempts' }, () => {
        fetchData();
      })
      .subscribe();

    // ⚡ 2. Polling Heartbeat (setiap 3 detik) sebagai jaminan fallback jika websocket sedang idle/reconnecting
    const pollingInterval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(pollingInterval);
    };
  }, [examId, fetchData, supabase]);

  // Modal & Toast state
  const [unlockUserId, setUnlockUserId] = useState<string | null>(null);
  const [forceSubmitUserId, setForceSubmitUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4500);
  };

  const confirmUnlock = async () => {
    if (!unlockUserId) return;
    setIsProcessing(true);
    try {
      const { unlockCbtParticipant } = await import('@/app/actions/auth');
      const { success, error } = await unlockCbtParticipant(examId, unlockUserId);
      if (error || !success) throw new Error(error || "Gagal");
      showToast(`Akses ${unlockUserId} berhasil dibuka! Peserta dapat melanjutkan ujian.`, 'success');
      fetchData();
    } catch (err: any) {
      showToast('Gagal: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
      setUnlockUserId(null);
    }
  };

  const confirmForceSubmit = async () => {
    if (!forceSubmitUserId) return;
    setIsProcessing(true);
    try {
      const { forceSubmitCbtParticipant } = await import('@/app/actions/auth');
      const { success, error } = await forceSubmitCbtParticipant(examId, forceSubmitUserId);
      if (error || !success) throw new Error(error || "Gagal");
      showToast(`Jawaban ${forceSubmitUserId} berhasil dipaksa kumpulkan!`, 'success');
      fetchData();
    } catch (err: any) {
      showToast('Gagal: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
      setForceSubmitUserId(null);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['ID Peserta', 'Nama', 'Sekolah', 'Cabang', 'Status', 'Pelanggaran', 'Jam Update'],
      ...participants.map(p => {
        const info = p.user_id ? (participantMap[p.user_id.toUpperCase()] || participantMap[p.user_id.replace("NCC-", "").toUpperCase()] || { full_name: "", school_origin: "", branch: "" }) : { full_name: "", school_origin: "", branch: "" };
        const isDone = p.status === 'submitted';
        const isBlocked = (p.violations_count >= 3) && !isDone;
        return [
          p.user_id,
          info.full_name || '-',
          info.school_origin || '-',
          info.branch || '-',
          isDone ? 'Selesai' : isBlocked ? 'Diblokir' : 'Aktif',
          p.violations_count,
          p.updated_at ? new Date(p.updated_at).toLocaleTimeString('id') : '-',
        ];
      })
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCTV_${examInfo.token}_${new Date().toLocaleDateString('id').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV berhasil!', 'success');
  };

  // Timer helper
  const getRemainingTime = (startedAt?: string) => {
    if (!startedAt) return null;
    const elapsed = (now.getTime() - new Date(startedAt).getTime()) / 1000;
    const total = examInfo.duration_minutes * 60;
    const remaining = Math.max(0, total - elapsed);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    const pct = Math.min(100, (elapsed / total) * 100);
    return { m, s, pct, isAlmostDone: remaining < 300, isDone: remaining === 0 };
  };

  // Tabs + filter
  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'active', label: 'Aktif' },
    { key: 'blocked', label: 'Diblokir' },
    { key: 'done', label: 'Selesai' },
  ];

  const classify = (p: Participant) => {
    const isDone = p.status === 'submitted';
    const isBlocked = (p.violations_count >= 3) && !isDone;
    return { isBlocked, isDone, isActive: !isDone && !isBlocked, isWarning: p.violations_count > 0 && p.violations_count < 3 && !isDone };
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return participants.filter(p => {
      const info = p.user_id ? (participantMap[p.user_id.toUpperCase()] || participantMap[p.user_id.replace("NCC-", "").toUpperCase()] || { full_name: "", school_origin: "", branch: "" }) : { full_name: "", school_origin: "", branch: "" };
      const matchSearch = !q || 
        (p.user_id || '').toLowerCase().includes(q) ||
        (info.full_name || '').toLowerCase().includes(q) ||
        (info.school_origin || '').toLowerCase().includes(q) ||
        (info.branch || '').toLowerCase().includes(q);
      
      const { isBlocked, isDone, isActive } = classify(p);
      const matchTab = 
        activeTab === 'all' ? true :
        activeTab === 'active' ? isActive :
        activeTab === 'blocked' ? isBlocked :
        isDone;
      
      return matchSearch && matchTab;
    });
  }, [participants, participantMap, search, activeTab]);

  const tabCount = (key: TabFilter) =>
    participants.filter(p => {
      const { isBlocked, isDone, isActive } = classify(p);
      if (key === 'active') return isActive;
      if (key === 'blocked') return isBlocked;
      if (key === 'done') return isDone;
      return true;
    }).length;

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-5 md:p-7 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/hq/llms" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-[#5145cd] shadow-sm transition-colors border border-gray-100 flex-shrink-0">
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">CCTV: {examInfo.title}</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                Token: <span className="text-[#5145cd]">{examInfo.token}</span>
                <span className="mx-2 text-gray-300">|</span>
                Durasi: {examInfo.duration_minutes} mnt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search — bisa cari ID, nama, sekolah */}
            <div className="relative flex-1 md:w-64">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Cari ID, nama, sekolah..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold focus:outline-none focus:border-[#5145cd] shadow-sm transition-colors"
              />
            </div>
            {/* Refresh manual */}
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              title="Refresh Data"
              className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-[#5145cd] hover:border-[#5145cd] shadow-sm transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* Export */}
            <button onClick={exportCSV} title="Export ke CSV"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 hover:border-[#5145cd] hover:text-[#5145cd] rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {/* Live badge */}
            <div className="px-3 py-2.5 bg-rose-50 text-rose-600 rounded-full flex items-center border border-rose-100 flex-shrink-0">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse mr-2" />
              <span className="text-[10px] font-black tracking-widest uppercase">LIVE</span>
            </div>
          </div>
        </div>

        {/* STATISTIK */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sedang Aktif</p>
              <h3 className="text-3xl font-black mt-1 text-gray-800">{stats.working}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-[#5145cd]">
              <ClockIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Telah Submit</p>
              <h3 className="text-3xl font-black mt-1 text-gray-800">{stats.submitted}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <CheckBadgeIcon className="w-5 h-5" />
            </div>
          </div>
          <div className={`p-5 rounded-[20px] shadow-sm border flex items-center justify-between transition-colors ${stats.cheating > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-100'}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${stats.cheating > 0 ? 'text-rose-500' : 'text-gray-400'}`}>Pelanggaran</p>
              <h3 className={`text-3xl font-black mt-1 ${stats.cheating > 0 ? 'text-rose-600' : 'text-gray-800'}`}>{stats.cheating}</h3>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.cheating > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-50 text-rose-300'}`}>
              <ShieldExclamationIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* PANEL UTAMA */}
        <div className="bg-white rounded-[28px] shadow-sm border border-gray-100">
          {/* Tab Bar */}
          <div className="flex items-center justify-between px-6 border-b border-gray-100">
            <div className="flex gap-0.5">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 -mb-px transition-all ${
                    activeTab === tab.key ? 'border-[#5145cd] text-[#5145cd]' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  <FunnelIcon className="w-3 h-3" />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.key ? 'bg-indigo-100 text-[#5145cd]' : 'bg-gray-100 text-gray-400'}`}>
                    {tabCount(tab.key)}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-[9px] text-gray-400 font-bold">
              Sync: {now.toLocaleTimeString()}
            </span>
          </div>

          {/* Grid Peserta */}
          <div className="p-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                <ComputerDesktopIcon className="w-12 h-12 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  {search ? `Tidak ada hasil untuk "${search}"` : 'Belum Ada Peserta'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(p => {
                  const { isBlocked, isDone, isWarning, isActive } = classify(p);
                  const timer = !isDone ? getRemainingTime(p.started_at) : null;
                  const info = p.user_id ? (participantMap[p.user_id.toUpperCase()] || participantMap[p.user_id.replace("NCC-", "").toUpperCase()] || { full_name: "", school_origin: "", branch: "" }) : { full_name: "", school_origin: "", branch: "" };

                  return (
                    <div key={p.user_id} className={`relative p-4 rounded-[18px] border-2 flex flex-col gap-2.5 transition-all
                      ${isBlocked ? 'bg-rose-50 border-rose-400' :
                        isWarning ? 'bg-amber-50 border-amber-300' :
                        isDone ? 'bg-emerald-50 border-emerald-200' :
                        'bg-gray-50 border-gray-150 hover:border-indigo-200 hover:bg-indigo-50/30'}`}
                    >
                      {/* Top accent bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-[16px]
                        ${isBlocked ? 'bg-rose-500' : isWarning ? 'bg-amber-400 animate-pulse' : isDone ? 'bg-emerald-400' : 'bg-indigo-300'}`} />

                      {/* Baris atas: ID + action icon */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 font-mono leading-tight">{p.user_id}</p>
                          <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5
                            ${isBlocked ? 'text-rose-600' : isWarning ? 'text-amber-600' : isDone ? 'text-emerald-600' : 'text-indigo-500'}`}>
                            {isBlocked ? '🔒 Diblokir' : isWarning ? '⚠️ Peringatan' : isDone ? '✅ Selesai' : '🟢 Aktif'}
                          </p>
                        </div>
                        {isBlocked ? (
                          <button onClick={() => setUnlockUserId(p.user_id)} title="Buka Blokir"
                            className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-emerald-500 transition-colors flex-shrink-0">
                            <LockClosedIcon className="w-3.5 h-3.5" />
                          </button>
                        ) : isDone ? (
                          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-500 flex-shrink-0">
                            <CheckBadgeIcon className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-400 flex-shrink-0">
                            <ComputerDesktopIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Info Nama & Sekolah (jika ada) */}
                      {(info.full_name || info.school_origin) && (
                        <div className="space-y-0.5">
                          {info.full_name && (
                            <div className="flex items-center gap-1 text-[9px] text-gray-600 font-semibold">
                              <UserCircleIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{info.full_name}</span>
                            </div>
                          )}
                          {info.school_origin && (
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                              <BuildingLibraryIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{info.school_origin}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timer bar */}
                      {timer && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className={`text-[8px] font-bold ${timer.isAlmostDone ? 'text-rose-500' : 'text-gray-400'}`}>Sisa</span>
                            <span className={`text-[9px] font-black tabular-nums ${timer.isAlmostDone ? 'text-rose-600' : 'text-gray-700'}`}>
                              {String(timer.m).padStart(2, '0')}:{String(timer.s).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${
                              timer.pct > 80 ? 'bg-rose-500' : timer.pct > 60 ? 'bg-amber-400' : 'bg-indigo-500'
                            }`} style={{ width: `${timer.pct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Pelanggaran badge */}
                      {p.violations_count > 0 && (
                        <div className={`text-center text-[9px] font-black py-0.5 rounded-lg
                          ${isBlocked ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                          {p.violations_count}× Pelanggaran
                        </div>
                      )}

                      {/* Tombol Paksa Submit */}
                      {!isDone && (
                        <button onClick={() => setForceSubmitUserId(p.user_id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                          <PaperAirplaneIcon className="w-3 h-3" />
                          Paksa Submit
                        </button>
                      )}

                      {/* Waktu submit */}
                      {isDone && (
                        <p className="text-center text-[8px] text-emerald-600 font-bold">
                          ✓ Selesai {p.updated_at ? new Date(p.updated_at).toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[10000] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-white text-xs font-black max-w-sm
            ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
            {toast.type === 'success' ? <CheckBadgeIcon className="w-4 h-4 shrink-0" /> : <ShieldExclamationIcon className="w-4 h-4 shrink-0" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* MODAL UNBLOCK */}
      {unlockUserId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockOpenIcon className="w-7 h-7" />
            </div>
            <h2 className="text-base font-black text-gray-900">Buka Blokir?</h2>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Pelanggaran <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{unlockUserId}</span> akan direset ke 0.
            </p>
            {participantMap[unlockUserId]?.full_name && (
              <p className="text-[11px] text-gray-400 mt-1">({participantMap[unlockUserId].full_name})</p>
            )}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setUnlockUserId(null)} disabled={isProcessing}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-50">
                Batal
              </button>
              <button onClick={confirmUnlock} disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-50">
                {isProcessing ? 'Memproses...' : 'Buka Akses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORCE SUBMIT */}
      {forceSubmitUserId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <PaperAirplaneIcon className="w-7 h-7" />
            </div>
            <h2 className="text-base font-black text-gray-900">Paksa Kumpulkan?</h2>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Jawaban <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">{forceSubmitUserId}</span> akan langsung dikumpulkan.
              <span className="block mt-1 text-rose-500 font-bold">Tindakan ini tidak bisa dibatalkan.</span>
            </p>
            {participantMap[forceSubmitUserId]?.full_name && (
              <p className="text-[11px] text-gray-400 mt-1">({participantMap[forceSubmitUserId].full_name})</p>
            )}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setForceSubmitUserId(null)} disabled={isProcessing}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-50">
                Batal
              </button>
              <button onClick={confirmForceSubmit} disabled={isProcessing}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-50">
                {isProcessing ? 'Memproses...' : 'Ya, Kumpulkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
