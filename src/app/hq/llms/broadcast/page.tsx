'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Megaphone, 
  SendHorizonal,
  Info,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Trash2,
  Clock
} from 'lucide-react';
import { getAdminBroadcasts, postAdminBroadcast, deleteAdminBroadcast } from '@/app/actions/auth';

export default function AdminBroadcast() {
  const supabase = createClient();

  // Form States
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // info, warning, danger
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // History States
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await getAdminBroadcasts();
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    const { success } = await deleteAdminBroadcast(id);
    if (success) fetchHistory();
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setStatus(null);

    try {
      const title = type === 'danger' ? '🚨 Peringatan Darurat' : type === 'warning' ? '⚠️ Peringatan' : '📢 Pengumuman';
      const { data, error } = await postAdminBroadcast({
        title,
        message: message.trim(),
        target_audience: 'All',
        type: type
      });

      if (error) throw new Error(error);

      setStatus({ success: true, msg: 'Pengumuman berhasil dipancarkan ke seluruh peserta!' });
      setMessage(''); 
      fetchHistory(); // Refresh history
    } catch (err: any) {
      console.error(err);
      setStatus({ success: false, msg: 'Gagal memancarkan pesan: ' + err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6 text-left">
        
        {/* HEADER BAR */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <Link href="/hq/llms" className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="text-left">
            <h1 className="text-lg font-bold text-gray-800 flex items-center tracking-tight">
              <Megaphone className="w-5 h-5 text-indigo-500 mr-2" />
              Pusat Siaran Pengumuman Massal
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Kirim instruksi langsung ke layar ujian seluruh peserta.</p>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm text-left">
          <form onSubmit={handleSendBroadcast} className="space-y-6 text-left">
            
            {/* TIPE SIARAN */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Tipe Sinyal Siaran</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* PILIHAN INFO */}
                <div 
                  onClick={() => setType('info')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3
                    ${type === 'info' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">Info Umum</span>
                </div>

                {/* PILIHAN WARNING */}
                <div 
                  onClick={() => setType('warning')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3
                    ${type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">Peringatan</span>
                </div>

                {/* PILIHAN DANGER */}
                <div 
                  onClick={() => setType('danger')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3
                    ${type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">Darurat</span>
                </div>

              </div>
            </div>

            {/* TEXTAREA INPUT */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Isi Pesan Siaran</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis instruksi pusat komando di sini... (Contoh: Sesi ujian sisa 10 menit lagi, silakan teliti kembali jawaban Anda)"
                className="w-full p-4 rounded-2xl border border-gray-200 outline-none text-sm font-bold text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm resize-none"
              ></textarea>
            </div>

            {/* STATUS NOTIFICATION */}
            {status && (
              <div className={`p-4 rounded-xl text-xs font-bold border animate-fade-in
                ${status.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {status.msg}
              </div>
            )}

            {/* ACTION BUTTON */}
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-3"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
              <span>{sending ? 'Meluncurkan Siaran...' : 'Pancarkan Ke Layar Peserta'}</span>
            </button>

          </form>
        </div>

        {/* RIWAYAT BROADCAST */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm text-left">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
            Riwayat Siaran
          </h2>
          
          {loadingHistory ? (
            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-300" /></div>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 font-bold text-center p-4">Belum ada riwayat siaran.</p>
          ) : (
            <div className="space-y-3">
              {history.map((ann) => {
                let annType = ann.type || 'info';
                try {
                  const parsed = JSON.parse(ann.content);
                  if (parsed.type) annType = parsed.type;
                } catch (e) {}
                const isWarning = annType === 'warning';
                const isDanger = annType === 'danger';
                return (
                  <div key={ann.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${
                    isDanger ? 'bg-rose-50 border-rose-100' :
                    isWarning ? 'bg-amber-50 border-amber-100' :
                    'bg-indigo-50 border-indigo-100'
                  }`}>
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      {isDanger ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : isWarning ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <Info className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 break-words">{ann.message || ann.content || ann.title || "-"}</p>
                      <p className="text-[9px] font-black text-gray-400 mt-1.5 uppercase tracking-wider">
                        {new Date(ann.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-all flex-shrink-0"
                      title="Hapus riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
