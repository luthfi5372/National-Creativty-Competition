'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Info, 
  AlertTriangle, 
  ShieldAlert,
  X 
} from 'lucide-react';

interface BroadcastBannerProps {
  examId?: string;
}

export default function BroadcastBanner({ examId }: BroadcastBannerProps) {
  const supabase = createClient();
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 📡 Realtime subscription for emergency announcements (CRITICAL - must be instant during exams)
    const channel = supabase
      .channel('live-broadcast-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const newMsg = payload.new;
          // Filter: Global (null) atau spesifik examId
          if (!newMsg.exam_id || newMsg.exam_id === examId) {
            setActiveAnnouncement(newMsg);
            setVisible(true);

            // Auto-tutup setelah 15 detik agar tidak mengganggu siswa
            const timer = setTimeout(() => {
              setVisible(false);
            }, 15000);
            return () => clearTimeout(timer);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId, supabase]);

  if (!visible || !activeAnnouncement) return null;

  // Berikan warna pastel yang lembut berdasarkan tipe pesan
  let bgStyles = "bg-white border-indigo-100 shadow-indigo-100/40 text-indigo-900";
  let iconElement = <Info className="w-6 h-6 text-indigo-500" />;
  let labelText = "Info Pusat Komando";

  if (activeAnnouncement.type === 'warning') {
    bgStyles = "bg-amber-50/95 border-amber-200 shadow-amber-100/40 text-amber-900";
    iconElement = <AlertTriangle className="w-6 h-6 text-amber-600" />;
    labelText = "Peringatan Panitia";
  } else if (activeAnnouncement.type === 'danger') {
    bgStyles = "bg-rose-50/95 border-rose-200 shadow-rose-100/40 text-rose-900";
    iconElement = <ShieldAlert className="w-6 h-6 text-rose-600" />;
    labelText = "PENGUMUMAN KRUSIAL";
  }

  return (
    <div className={`fixed bottom-6 right-6 max-w-sm w-full p-5 rounded-[2rem] border shadow-2xl flex items-start space-x-4 z-[100] backdrop-blur-md transition-all duration-700 animate-in slide-in-from-bottom-10 ${bgStyles}`}>
      <div className="flex-shrink-0 p-3 bg-white/50 rounded-2xl shadow-inner">{iconElement}</div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">{labelText}</p>
        <p className="text-sm font-bold leading-tight">{activeAnnouncement.message || activeAnnouncement.content || "-"}</p>
      </div>
      <button 
        onClick={() => setVisible(false)}
        className="p-1.5 rounded-full hover:bg-black/5 opacity-40 hover:opacity-80 transition-all shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
