import React from "react";
import { 
  Calendar, Pin, Trophy, Brain, Zap, MonitorPlay, Star, Video, FileText, Megaphone, Upload, Users, CheckCircle2, Sparkles
} from "lucide-react";

const TIMELINE_DATA = [
  {
    category: "LKTI Nasional",
    color: "blue",
    waves: [
      { label: "Gelombang I", items: [
        { icon: FileText, label: "Pendaftaran & Abstrak", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman Tahap I", start: "", end: "" },
        { icon: Upload, label: "Pengumpulan Fullpaper", start: "", end: "" },
        { icon: Trophy, label: "Pengumuman Tahap II", start: "", end: "" }
      ]},
      { label: "Gelombang II", items: [
        { icon: FileText, label: "Pendaftaran & Abstrak", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman Tahap I", start: "", end: "" },
        { icon: Upload, label: "Pengumpulan Fullpaper", start: "", end: "" },
        { icon: Trophy, label: "Pengumuman Tahap II", start: "", end: "" }
      ]}
    ]
  },
  {
    category: "Olimpiade MIPA",
    color: "amber",
    waves: [
      { label: "Gelombang I", items: [
        { icon: FileText, label: "Pendaftaran", start: "", end: "" },
        { icon: Brain, label: "Seleksi 1", start: "", end: "" },
        { icon: Zap, label: "Seleksi 2", start: "", end: "" },
        { icon: Star, label: "Pengumuman Tahap I", start: "", end: "" }
      ]},
      { label: "Gelombang II", items: [
        { icon: FileText, label: "Pendaftaran", start: "", end: "" },
        { icon: MonitorPlay, label: "Simulasi", start: "", end: "" },
        { icon: Zap, label: "Seleksi", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman", start: "", end: "" }
      ]}
    ]
  },
  {
    category: "Speech Contest",
    color: "purple",
    waves: [
      { label: "Gelombang I", items: [
        { icon: FileText, label: "Pendaftaran & Naskah", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman", start: "", end: "" }
      ]},
      { label: "Gelombang II", items: [
        { icon: FileText, label: "Pendaftaran & Naskah", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman", start: "", end: "" }
      ]}
    ]
  },
  {
    category: "MTQ",
    color: "emerald",
    waves: [
      { label: "Gelombang I", items: [
        { icon: Video, label: "Pendaftaran & Video", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman", start: "", end: "" }
      ]},
      { label: "Gelombang II", items: [
        { icon: FileText, label: "Pendaftaran", start: "", end: "" },
        { icon: Megaphone, label: "Pengumuman", start: "", end: "" }
      ]}
    ]
  }
];

interface TimelineProps {
  userCategory?: string;
  userStatus?: string;
  notes?: string;
  globalTimeline?: any[];
  portalWaves?: any[];
}

export default function TimelineWidget({ userCategory, userStatus, notes, globalTimeline, portalWaves }: TimelineProps) {
  // --- STATE LOADING INTERNAL ---
  const [isInitializing, setIsInitializing] = React.useState(true);
  
  React.useEffect(() => {
    if (globalTimeline !== undefined) {
      const timer = setTimeout(() => setIsInitializing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [globalTimeline]);

  // Icon Mapper berdasarkan label item
  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('pendaftaran') || l.includes('naskah') || l.includes('video')) return FileText;
    if (l.includes('pengumuman')) return Megaphone;
    if (l.includes('fullpaper') || l.includes('unggah') || l.includes('karya')) return Upload;
    if (l.includes('seleksi') || l.includes('simulasi') || l.includes('ujian') || l.includes('cbt')) return Brain;
    if (l.includes('final') || l.includes('juara') || l.includes('puncak')) return Trophy;
    if (l.includes('technical') || l.includes('meeting') || l.includes('wawancara') || l.includes('mentoring') || l.includes('diskusi') || l.includes('pembekalan')) return Users;
    return Zap;
  };

  // Color Mapper berdasarkan kategori
  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('lkti')) return 'blue';
    if (c.includes('mipa')) return 'amber';
    if (c.includes('speech')) return 'purple';
    if (c.includes('mtq')) return 'green';
    return 'blue';
  };

  // Mapping antara kategori di database dengan kategori di TIMELINE_DATA
  const categoryMap: Record<string, string> = {
    "LKTI Nasional": "LKTI – Lomba Karya Tulis Ilmiah",
    "Olimpiade MIPA": "Olimpiade MIPA",
    "Speech Contest": "Speech Contest",
    "MTQ": "MTQ",
    "MTQ Nasional": "MTQ"
  };

  // Gunakan globalTimeline jika ada, jika tidak fallback ke TIMELINE_DATA
  const baseData = globalTimeline && globalTimeline.length > 0 
    ? globalTimeline.map(cat => {
        return {
          category: cat.category,
          color: getCategoryColor(cat.category),
          waves: cat.waves.map((wave: any) => {
            const matchedPortalWave = portalWaves && portalWaves.length > 0
              ? portalWaves.find((w: any) => {
                  const cleanLabel = wave.label.toLowerCase();
                  const cleanName = w.name.toLowerCase();
                  if (cleanLabel.includes('iii') && cleanName.includes('3')) return true;
                  if (cleanLabel.includes('ii') && !cleanLabel.includes('iii') && cleanName.includes('2')) return true;
                  if (cleanLabel.includes('i') && !cleanLabel.includes('ii') && !cleanLabel.includes('iii') && cleanName.includes('1')) return true;
                  
                  const digitsLabel = cleanLabel.replace(/\D/g, '');
                  const digitsName = cleanName.replace(/\D/g, '');
                  if (digitsLabel && digitsName && digitsLabel === digitsName) return true;
                  return false;
                })
              : null;
            const isActive = matchedPortalWave 
              ? matchedPortalWave.status === 'Aktif'
              : true;

            return {
              label: wave.label,
              active: isActive,
              items: wave.items.map((item: any) => ({
                icon: getIcon(item.label),
                label: item.label,
                start: item.start || "",
                end: item.end || "",
                date: item.date || "",
                type: item.type || "",
                isCustom: item.isCustom || false
              }))
            };
          })
        };
      })
    : TIMELINE_DATA;

  // Tentukan apakah kita harus memfilter data berdasarkan kategori user
  const targetCategoryName = userCategory ? categoryMap[userCategory] : null;
  
  const filteredData = targetCategoryName 
    ? baseData.filter(item => {
        const cat = item.category.toLowerCase();
        const target = targetCategoryName.toLowerCase();
        const userCat = userCategory?.toLowerCase() || "";
        const keywords = ["lkti", "mipa", "speech", "mtq"];
        const matchedKeyword = keywords.find(k => userCat.includes(k));
        
        return cat === target || 
               cat === userCat || 
               cat.includes(userCat) || 
               (matchedKeyword && cat.includes(matchedKeyword));
      })
    : baseData;

  const isFiltered = !!targetCategoryName && filteredData.length > 0;

  // Logika Menentukan Tahap Mana yang Harus Menyala
  const getProgressLevel = (status?: string, notesStr?: string) => {
    if (notesStr) {
      try {
        const parsed = JSON.parse(notesStr);
        if (parsed.current_stage) return parseInt(parsed.current_stage);
      } catch (e) {}
    }
    if (!status) return 1;
    const s = status.toLowerCase();
    if (s.includes('final') || s.includes('tahap 3')) return 3;
    if (s.includes('semi') || s.includes('tahap 2') || s.includes('seleksi 2')) return 2;
    return 1;
  };

  const userProgress = getProgressLevel(userStatus, notes);

  const getItemActiveState = (itemLabel: string) => {
    if (!isFiltered) return true;
    const label = itemLabel.toLowerCase();
    if (label.includes('tahap iii') || label.includes('grand final') || label.includes('final')) return userProgress >= 3;
    if (label.includes('tahap ii') || label.includes('fullpaper') || label.includes('seleksi 2') || label.includes('semi final')) return userProgress >= 2;
    return userProgress >= 1;
  };

  // Helper untuk menentukan state item dinamis
  const getItemState = (item: any, waveActive: boolean) => {
    if (!waveActive) return "locked";
    
    const isAllowedByProgress = getItemActiveState(item.label);
    if (!isAllowedByProgress) return "locked";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = item.start ? new Date(item.start) : null;
    const endDate = item.end ? new Date(item.end) : null;

    if (!startDate && !endDate) {
      const label = item.label.toLowerCase();
      if (label.includes('tahap iii') || label.includes('grand final') || label.includes('final')) {
        return userProgress === 3 ? "active" : userProgress > 3 ? "completed" : "locked";
      }
      if (label.includes('tahap ii') || label.includes('fullpaper') || label.includes('seleksi 2') || label.includes('semi final')) {
        return userProgress === 2 ? "active" : userProgress > 2 ? "completed" : "locked";
      }
      return userProgress === 1 ? "active" : userProgress > 1 ? "completed" : "locked";
    }

    const start = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
    const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;

    const label = item.label.toLowerCase();
    if (label.includes('pendaftaran') || label.includes('registrasi')) {
      return userStatus === 'Verified' ? 'completed' : 'active';
    }

    if (start && today < start) {
      return "locked";
    }

    if (end && today > end) {
      return "completed";
    }

    return "active"; // In Progress
  };

  // Helper untuk merender style gamifikasi kartu
  const getGamifiedClasses = (color: string, state: "completed" | "active" | "locked") => {
    const isCompleted = state === "completed";
    const isActive = state === "active";
    
    if (state === "locked") {
      return {
        cardBorder: "border-slate-100 bg-slate-50/40",
        cardShadow: "shadow-none",
        text: "text-slate-400 font-bold",
        desc: "text-slate-350",
        iconContainer: "bg-slate-100 text-slate-400",
        dateContainer: "bg-slate-50 text-slate-400 border-slate-150",
        opacity: "opacity-40 grayscale pointer-events-none",
        badge: (
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 select-none border border-slate-200/50 shadow-sm">
            🔒 Terkunci
          </span>
        )
      };
    }

    const getColorClasses = (color: string, isActive: boolean) => {
      const maps: any = {
        blue: {
          dot: "bg-blue-500", ring: "ring-blue-100", text: "text-blue-600", bg: "bg-blue-50",
          border: "border-blue-100", accent: "text-blue-600", cardBorder: "hover:border-blue-300", cardShadow: "hover:shadow-blue-50/50"
        },
        amber: {
          dot: "bg-amber-500", ring: "ring-amber-100", text: "text-amber-600", bg: "bg-amber-50",
          border: "border-amber-100", accent: "text-amber-600", cardBorder: "hover:border-amber-300", cardShadow: "hover:shadow-amber-50/50"
        },
        purple: {
          dot: "bg-purple-500", ring: "ring-purple-100", text: "text-purple-600", bg: "bg-purple-50",
          border: "border-purple-100", accent: "text-purple-600", cardBorder: "hover:border-purple-300", cardShadow: "hover:shadow-purple-50/50"
        },
        green: {
          dot: "bg-green-500", ring: "ring-green-100", text: "text-green-600", bg: "bg-green-50",
          border: "border-green-100", accent: "text-green-600", cardBorder: "hover:border-green-300", cardShadow: "hover:shadow-green-50/50"
        }
      };
      return maps[color] || maps.blue;
    };

    const styles = getColorClasses(color, true);

    const maps: any = {
      blue: {
        activeBorder: "border-blue-300 ring-4 ring-blue-50 bg-white",
        completedBorder: "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/20",
        textActive: "text-slate-800 font-extrabold",
        textCompleted: "text-slate-600 font-bold",
        iconActive: "bg-blue-600 text-white shadow-md shadow-blue-200",
        iconCompleted: "bg-emerald-100 text-emerald-600 border border-emerald-200",
        dateActive: "bg-blue-50 text-blue-600 border-blue-100",
        dateCompleted: "bg-emerald-50 text-emerald-600 border-emerald-100"
      },
      amber: {
        activeBorder: "border-amber-300 ring-4 ring-amber-50 bg-white",
        completedBorder: "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/20",
        textActive: "text-slate-800 font-extrabold",
        textCompleted: "text-slate-600 font-bold",
        iconActive: "bg-amber-500 text-white shadow-md shadow-amber-200",
        iconCompleted: "bg-emerald-100 text-emerald-600 border border-emerald-200",
        dateActive: "bg-amber-50 text-amber-600 border-amber-100",
        dateCompleted: "bg-emerald-50 text-emerald-600 border-emerald-100"
      },
      purple: {
        activeBorder: "border-purple-300 ring-4 ring-purple-50 bg-white",
        completedBorder: "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/20",
        textActive: "text-slate-800 font-extrabold",
        textCompleted: "text-slate-600 font-bold",
        iconActive: "bg-purple-600 text-white shadow-md shadow-purple-200",
        iconCompleted: "bg-emerald-100 text-emerald-600 border border-emerald-200",
        dateActive: "bg-purple-50 text-purple-600 border-purple-100",
        dateCompleted: "bg-emerald-50 text-emerald-600 border-emerald-100"
      },
      green: {
        activeBorder: "border-green-300 ring-4 ring-green-50 bg-white",
        completedBorder: "border-emerald-200 bg-emerald-50/10 shadow-emerald-50/20",
        textActive: "text-slate-800 font-extrabold",
        textCompleted: "text-slate-600 font-bold",
        iconActive: "bg-green-600 text-white shadow-md shadow-green-200",
        iconCompleted: "bg-emerald-100 text-emerald-600 border border-emerald-200",
        dateActive: "bg-green-50 text-green-600 border-green-100",
        dateCompleted: "bg-emerald-50 text-emerald-600 border-emerald-100"
      }
    };

    const scheme = maps[color] || maps.blue;

    return {
      cardBorder: isActive ? scheme.activeBorder : scheme.completedBorder,
      cardShadow: isActive ? "shadow-lg shadow-indigo-100/40 scale-[1.01]" : "shadow-sm",
      text: isActive ? scheme.textActive : scheme.textCompleted,
      desc: "text-slate-500",
      iconContainer: isActive ? scheme.iconActive : scheme.iconCompleted,
      dateContainer: isActive ? scheme.dateActive : scheme.dateCompleted,
      opacity: "",
      badge: isCompleted ? (
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 border border-emerald-200 shadow-sm animate-fade-in">
          ✓ Selesai
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-md shadow-indigo-200 animate-pulse">
          ✨ Berjalan
        </span>
      )
    };
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const maps: any = {
      blue: {
        dot: "bg-blue-500", ring: "ring-blue-100", text: "text-blue-600", bg: "bg-blue-50",
        border: "border-blue-100", accent: "text-blue-600", cardBorder: "hover:border-blue-300", cardShadow: "hover:shadow-blue-50/50"
      },
      amber: {
        dot: "bg-amber-500", ring: "ring-amber-100", text: "text-amber-600", bg: "bg-amber-50",
        border: "border-amber-100", accent: "text-amber-600", cardBorder: "hover:border-amber-300", cardShadow: "hover:shadow-amber-50/50"
      },
      purple: {
        dot: "bg-purple-500", ring: "ring-purple-100", text: "text-purple-600", bg: "bg-purple-50",
        border: "border-purple-100", accent: "text-purple-600", cardBorder: "hover:border-purple-300", cardShadow: "hover:shadow-purple-50/50"
      },
      green: {
        dot: "bg-green-500", ring: "ring-green-100", text: "text-green-600", bg: "bg-green-50",
        border: "border-green-100", accent: "text-green-600", cardBorder: "hover:border-green-300", cardShadow: "hover:shadow-green-50/50"
      }
    };
    return maps[color] || maps.blue;
  };

  // Helper untuk menghitung persentase garis progress
  const calculateProgressHeight = (waves: any[]) => {
    if (!waves || waves.length === 0) return 0;
    
    const allItems = waves.flatMap(w => w.items.map(item => getItemState(item, w.active)));
    const totalCount = allItems.length;
    if (totalCount === 0) return 0;

    const score = allItems.reduce((acc, state) => {
      if (state === "completed") return acc + 1;
      if (state === "active") return acc + 0.5;
      return acc;
    }, 0);

    return Math.min((score / totalCount) * 100, 100);
  };

  // Helper untuk mendapatkan style checkpoint bullet point
  const getCheckpointStyle = (wave: any) => {
    const allItems = wave.items.map((item: any) => getItemState(item, wave.active));
    const isCompleted = allItems.every((s: string) => s === "completed");
    const isActive = wave.active && allItems.some((s: string) => s === "active" || s === "completed");

    if (isCompleted) {
      return "bg-emerald-500 border-emerald-100 shadow-emerald-200/50 scale-110";
    }
    if (isActive) {
      return "bg-indigo-600 border-indigo-100 shadow-indigo-300/50 scale-110 ring-2 ring-indigo-50 animate-pulse";
    }
    return "bg-slate-200 border-slate-100";
  };

  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (isInitializing) {
    return (
      <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 mt-8 animate-pulse">
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-200/50">
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-100 rounded"></div>
            <div className="h-3 w-32 bg-slate-100 rounded"></div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="h-32 w-full bg-slate-50 rounded-2xl"></div>
          <div className="h-32 w-full bg-slate-50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 mt-8">
      <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-200/50 text-left">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <Calendar size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isFiltered ? `Jadwal Khusus ${userCategory}` : "Jadwal Perlombaan NCC 13th"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFiltered ? "Berdasarkan kategori lomba yang Anda ikuti" : "Seluruh cabang lomba • Gelombang I & II"}
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {filteredData.map((category, idx) => (
          <div key={idx} className="group/timeline">
            <div className="flex items-center gap-3 mb-6 transition-transform group-hover/timeline:translate-x-1 duration-300 text-left">
              <span className={`w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 shrink-0`}></span>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">{category.category}</h3>
            </div>
            
            {/* Gamified Road Container */}
            <div className="relative pl-7 ml-[5px] space-y-12">
              
              {/* Thickened Progression Path (4px Game Level Road) */}
              <div className="absolute left-0 top-3 bottom-3 w-[4px] bg-slate-100 rounded-full"></div>
              <div 
                className="absolute left-0 top-3 w-[4px] bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ height: `${calculateProgressHeight(category.waves)}%` }}
              ></div>

              {category.waves.map((wave: any, wIdx: number) => {
                const styles = getColorClasses(category.color, wave.active);
                return (
                  <div key={wIdx} className="relative text-left">
                    
                    {/* Checkpoint Bullet Orb */}
                    <div className={`absolute -left-[35px] top-1 w-5 h-5 rounded-full bg-white border-[4px] shadow-sm flex items-center justify-center text-white transition-all duration-500 z-20 ${getCheckpointStyle(wave)}`}></div>
                    
                    <span className={`text-[10px] font-black ${styles.text} uppercase tracking-widest ${styles.bg} px-2.5 py-1 rounded-lg border ${styles.border}`}>
                      {wave.label}
                    </span>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                      {wave.items.map((item: any, iIdx: number) => {
                        const itemState = getItemState(item, wave.active);
                        const gamified = getGamifiedClasses(category.color, itemState);
                        
                        return (
                          <div 
                            key={iIdx} 
                            className={`bg-white border ${gamified.cardBorder} hover:shadow-xl ${gamified.cardShadow} p-5 rounded-2xl transition-all duration-500 flex flex-col justify-between min-w-0 relative z-10 ${gamified.opacity || ""}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-xl ${gamified.iconContainer} shrink-0 transition-colors duration-500`}>
                                  <item.icon size={16} />
                                </div>
                                <p className={`text-xs ${gamified.text} leading-relaxed break-words transition-colors duration-500`}>
                                  {item.label}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {gamified.badge}
                              </div>
                            </div>
                            
                            <div className="mt-auto">
                              <p className={`text-[10px] font-black bg-white border ${gamified.dateContainer} px-3 py-1.5 rounded-lg inline-block break-all sm:break-normal transition-colors duration-500`}>
                                {item.type === 'single' ? (
                                  item.start ? formatIndoDate(item.start) : "Belum Ditentukan"
                                ) : (item.start && item.end) || (item.type === 'range' && item.start && item.end) ? (
                                  <>
                                    {formatIndoDate(item.start)} – {formatIndoDate(item.end)}
                                  </>
                                ) : item.start ? (
                                  formatIndoDate(item.start)
                                ) : item.end ? (
                                  <>
                                    s.d. {formatIndoDate(item.end)}
                                  </>
                                ) : (
                                  item.date || "Belum Ditentukan"
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {idx < filteredData.length - 1 && <hr className="border-slate-100/80 mt-12 mb-0" />}
          </div>
        ))}

        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-[2rem] p-6 flex items-center gap-5 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-500 group relative overflow-hidden text-left">
          <div className="absolute top-[-20%] right-[-5%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300">
            <Pin size={28} className="text-white animate-bounce" />
          </div>
          <div>
            <p className="font-black text-white text-base tracking-wide">Technical Meeting – Semua Lomba</p>
            <p className="text-indigo-100 text-xs font-bold mt-1.5 bg-black/20 px-3 py-1 rounded-xl w-max border border-white/10">18 November • Semua Cabang Lomba</p>
          </div>
        </div>
      </div>
    </div>
  );
}
