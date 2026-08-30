import { CheckCircle2, Clock, AlertCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  userEntry: any;
  currentUser: any;
  handleLogout: () => void;
  progress: number;
  isPaymentRequired?: boolean;
  isFailed?: boolean;
}

export default function DashboardHeader({ userEntry, currentUser, handleLogout, progress, isPaymentRequired = true, isFailed = false }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-[40] -mx-4 px-4 py-4 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/50">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Halo, Peserta NCC!</h1>
        <p className="text-slate-500 font-medium mt-1">Selamat datang di Dasbor Resmi National Creativity Competition 13th.</p>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-white border border-white/80 px-4 py-2 rounded-2xl shadow-sm">
          {(() => {
            let photoUrl = "";
            if (userEntry?.notes) {
              try {
                const pObj = JSON.parse(userEntry.notes);
                photoUrl = pObj.profile_photo_url;
              } catch (e) {}
            }
            
            if (photoUrl) {
              return (
                <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                  <img 
                    src={photoUrl} 
                    alt="" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                    className="w-10 h-10 rounded-full object-cover border border-blue-200" 
                  />
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full hidden items-center justify-center font-bold">
                    {currentUser?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                </div>
              );
            }
            
            return (
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {currentUser?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || "P"}
              </div>
            );
          })()}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Anda</p>
            <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
              {!userEntry ? (
                <><AlertCircle size={14} className="text-slate-500"/> Belum Daftar Lomba</>
              ) : isFailed ? (
                <><AlertCircle size={14} className="text-rose-500"/> Tidak Lolos Babak</>
              ) : userEntry.payment_status === 'Verified' ? (
                <><CheckCircle2 size={14} className="text-blue-600"/> Terverifikasi</>
              ) : userEntry.payment_status === 'Pending' ? (
                <><Clock size={14} className="text-amber-500"/> Menunggu Verifikasi</>
              ) : userEntry.payment_status === 'Rejected' ? (
                <><AlertCircle size={14} className="text-rose-500"/> Berkas Ditolak</>
              ) : !isPaymentRequired ? (
                <><CheckCircle2 size={14} className="text-emerald-500"/> Aktif (Bebas Biaya)</>
              ) : (
                <><AlertCircle size={14} className="text-amber-500"/> Belum Menyelesaikan Pembayaran</>
              )}
            </div>
          </div>
        </div>

        {/* 🏅 HEADER PROGRESS PILL - THE PRIMARY INDICATOR */}
        <div className="hidden sm:flex items-center gap-3 bg-white border border-white/80 px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-default">
          <div className="relative w-9 h-9">
             <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#headGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="263.89"
                  initial={{ strokeDashoffset: 263.89 }}
                  animate={{ strokeDashoffset: 263.89 - (263.89 * progress) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{ filter: progress === 100 ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" : "none" }}
                />
                <defs>
                  <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
             </svg>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-800 font-display">{progress}%</span>
             </div>
          </div>
          <div className="flex flex-col">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-tight">Status Profil</p>
            <p className={`text-[11px] font-black tracking-tight ${progress === 100 ? 'text-green-600' : 'text-indigo-600'} flex items-center gap-1`}>
              {progress === 100 ? "SIAP VERIFIKASI ✨" : "LENGKAPI DATA"}
            </p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          title="Keluar dari Akun"
          className="p-3 bg-white border border-white/80 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl shadow-sm transition-all flex items-center justify-center active:scale-95"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
