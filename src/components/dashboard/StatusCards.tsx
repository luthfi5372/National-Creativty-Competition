import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, User, IdCard, ImageIcon, FolderOpen, BookOpen, MessageCircle, Target, Sparkles, ChevronRight, Ticket, Copy, Check, Loader2, Upload, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { generateTicketCode } from "@/lib/utils";

interface StatusCardsProps {
  userEntry: any;
  setUserEntry: React.Dispatch<React.SetStateAction<any>>;
  currentUser: any;
  isSubmissionOpen: boolean;
  activeSubmissionWave?: string;
  setShowForm: (val: boolean) => void;
  setShowIdCard: (val: boolean) => void;
  showToast: (msg: string, type: "success" | "error") => void;
  progress: number;
  paymentRequirementStage?: string;
  isRegistrationOpen?: boolean;
  portalWaves?: any[];
}

export default function StatusCards({
  userEntry,
  setUserEntry,
  currentUser,
  isSubmissionOpen,
  activeSubmissionWave = "",
  setShowForm,
  setShowIdCard,
  showToast,
  progress,
  paymentRequirementStage = 'registration',
  isRegistrationOpen = true,
  portalWaves = []
}: StatusCardsProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);

  // 💳 DYNAMIC PAYMENT DETAILS CONFIG
  const [dynamicPaymentConfig, setDynamicPaymentConfig] = useState<any>({
    bankName: "Bank Mandiri",
    bankBadge: "MANDIRI",
    accountNumber: "123-456-789-0123",
    accountHolder: "Panitia National Creativity Competition",
    amount: 150000,
    amountFormatted: "Rp 150.000",
    description: "Untuk mengaktifkan kepesertaan Anda di cabang {category}, silakan lakukan transfer administrasi pendaftaran:"
  });

  // 💬 DYNAMIC WHATSAPP GROUP LINKS
  const [dynamicGroupLinks, setDynamicGroupLinks] = useState<Record<string, string>>({
    general: "",
    mipa: "",
    lkti: "",
    speech: "",
    mtq: ""
  });

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const { getPaymentConfig, getGroupLinks } = await import('@/app/actions/auth');
        const [pRes, gRes] = await Promise.all([
          getPaymentConfig(),
          getGroupLinks()
        ]);
        if (pRes && pRes.data) {
          setDynamicPaymentConfig(pRes.data);
        }
        if (gRes && gRes.data) {
          setDynamicGroupLinks(gRes.data);
        }
      } catch (err) {
        console.error("Gagal load payment/group config:", err);
      }
    };
    loadConfigs();

    const channel = supabase.channel('realtime-dashboard-configs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        if (payload.new && ['SYS_PAYMENT_CONFIG', 'SYS_COMMUNITY_GROUPS'].includes((payload.new as any).title)) {
          loadConfigs();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  
  // 🌊 DYNAMIC REGISTRATION OPEN CALCULATION FROM settings/waves
  const activeWave = portalWaves.find((w: any) => w.status === "Aktif");
  const isRegEffectiveOpen = isRegistrationOpen && !!activeWave;
  const waveNameClean = activeWave ? activeWave.name.split(" (")[0] : "";

  const getButtonText = () => {
    if (isRegEffectiveOpen) {
      return `Lengkapi Berkas ${waveNameClean} Sekarang`;
    }
    const hasAnyActive = portalWaves.some((w: any) => w.status === "Aktif");
    if (!hasAnyActive && portalWaves.length > 0) {
      return "Semua Gelombang Pendaftaran Telah Ditutup";
    }
    return "Pendaftaran Ditutup Sementara";
  };
  
  // Ambil submission_url yang sudah tersimpan di database
  const savedSubmissionUrl = (() => {
    let parsedNotes: any = {};
    if (userEntry?.notes) {
      try { parsedNotes = JSON.parse(userEntry?.notes); } catch (e) {}
    }
    return parsedNotes.submission_url || "";
  })();
  
  const [submissionUrl, setSubmissionUrl] = useState(() => {
    let parsedNotes: any = {};
    if (userEntry?.notes) {
      try { parsedNotes = JSON.parse(userEntry?.notes); } catch (e) {}
    }
    return parsedNotes.submission_url || "";
  });
  
  const [profileForm, setProfileForm] = useState({
    full_name: userEntry?.full_name || "",
    school_name: userEntry?.school_name || userEntry?.school || "",
    phone: userEntry?.phone || "",
    nisn: userEntry?.nisn || "",
    province: userEntry?.province || "",
    team_name: userEntry?.team_name || "",
    participant2_name: userEntry?.participant2_name || "",
    participant2_nisn: userEntry?.participant2_nisn || ""
  });

  // 🔄 Sync form state when userEntry changes (important for real-time updates)
  useEffect(() => {
    if (isEditingProfile) return;
    if (userEntry) {
      setProfileForm({
        full_name: userEntry.full_name || "",
        school_name: userEntry.school_name || userEntry.school || "",
        phone: userEntry.phone || "",
        nisn: userEntry.nisn || "",
        province: userEntry.province || "",
        team_name: userEntry.team_name || "",
        participant2_name: userEntry.participant2_name || "",
        participant2_nisn: userEntry.participant2_nisn || ""
      });
    }
  }, [userEntry, isEditingProfile]);

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [studentCard, setStudentCard] = useState<File | null>(null);
  const [twibbon, setTwibbon] = useState<File | null>(null);
  const [instagramFollow, setInstagramFollow] = useState<File | null>(null);

  const [profilePhoto2, setProfilePhoto2] = useState<File | null>(null);
  const [studentCard2, setStudentCard2] = useState<File | null>(null);
  const [twibbon2, setTwibbon2] = useState<File | null>(null);

  const handleUploadProfileFiles = async () => {
    if (!profilePhoto && !studentCard && !twibbon && !instagramFollow && !profilePhoto2 && !studentCard2 && !twibbon2) {
      return showToast("Pilih file berkas terlebih dahulu!", "error");
    }

    setIsUploadingFiles(true);
    try {
      let notesObj: any = {};
      if (userEntry?.notes) {
        try { notesObj = JSON.parse(userEntry.notes); } catch (e) {}
      }

      const uploadFile = async (file: File, typeLabel: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userEntry?.id}-${typeLabel}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
        return urlData.publicUrl;
      };

      if (instagramFollow) {
        notesObj.instagram_follow_url = await uploadFile(instagramFollow, "instagram");
      }
      if (profilePhoto) {
        notesObj.profile_photo_url = await uploadFile(profilePhoto, "formal");
      }
      if (studentCard) {
        notesObj.student_card_url = await uploadFile(studentCard, "card");
      }
      if (twibbon) {
        notesObj.twibbon_url = await uploadFile(twibbon, "twibbon");
      }

      if (profilePhoto2) {
        notesObj.profile_photo_url2 = await uploadFile(profilePhoto2, "formal2");
      }
      if (studentCard2) {
        notesObj.student_card_url2 = await uploadFile(studentCard2, "card2");
      }
      if (twibbon2) {
        notesObj.twibbon_url2 = await uploadFile(twibbon2, "twibbon2");
      }

      const updatedNotes = JSON.stringify(notesObj);
      const { error: dbError } = await supabase.from('competition_entries').update({ notes: updatedNotes }).eq('id', userEntry?.id);
      if (dbError) throw dbError;

      showToast("Berkas pendaftaran berhasil diperbarui!", "success");
      setUserEntry((prev: any) => ({ ...prev, notes: updatedNotes }));
      
      // Reset all states
      setProfilePhoto(null);
      setStudentCard(null);
      setTwibbon(null);
      setInstagramFollow(null);
      setProfilePhoto2(null);
      setStudentCard2(null);
      setTwibbon2(null);
    } catch (err: any) {
      console.error("Upload files error:", err);
      let errMsg = err.message || "Kesalahan tidak dikenal";
      if (errMsg.toLowerCase().includes("bucket") || errMsg.toLowerCase().includes("not_found") || errMsg.toLowerCase().includes("not found")) {
        errMsg = "Bucket 'payment-proofs' tidak ditemukan di database Supabase. Silakan hubungi admin untuk menjalankan migrasi database/storage.";
      }
      showToast(`Gagal mengunggah berkas: ${errMsg}`, "error");
    } finally {
      setIsUploadingFiles(false);
    }
  };

  // 🌊 HAPUS BERKAS DARI NOTES DUA ARAH
  const handleRemoveFile = async (key: string) => {
    let fileLabel = 'Berkas';
    if (key === 'profile_photo_url') fileLabel = 'Foto Formal (Ketua)';
    else if (key === 'student_card_url') fileLabel = 'Kartu Pelajar (Ketua)';
    else if (key === 'twibbon_url') fileLabel = 'Twibbon (Ketua)';
    else if (key === 'profile_photo_url2') fileLabel = 'Foto Formal (Anggota 2)';
    else if (key === 'student_card_url2') fileLabel = 'Kartu Pelajar (Anggota 2)';
    else if (key === 'twibbon_url2') fileLabel = 'Twibbon (Anggota 2)';
    else if (key === 'instagram_follow_url') fileLabel = 'Bukti Follow Instagram';

    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${fileLabel}?`)) return;
    
    try {
      let notesObj: any = {};
      if (userEntry?.notes) {
        try { notesObj = JSON.parse(userEntry.notes); } catch (e) {}
      }
      
      delete notesObj[key];
      const updatedNotes = JSON.stringify(notesObj);
      
      const { error } = await supabase
        .from('competition_entries')
        .update({ notes: updatedNotes })
        .eq('id', userEntry?.id);
        
      if (error) throw error;
      
      showToast(`${fileLabel} berhasil dihapus!`, "success");
      setUserEntry((prev: any) => ({ ...prev, notes: updatedNotes }));
    } catch (err: any) {
      showToast(`Gagal menghapus: ${err.message}`, "error");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi input agar tidak boleh kosong atau hanya spasi
    if (!profileForm.full_name || !profileForm.full_name.trim()) {
      showToast("Nama Lengkap tidak boleh kosong!", "error");
      return;
    }
    if (!profileForm.school_name || !profileForm.school_name.trim()) {
      showToast("Nama Asal Sekolah tidak boleh kosong!", "error");
      return;
    }
    if (!profileForm.phone || !profileForm.phone.trim()) {
      showToast("Nomor WhatsApp tidak boleh kosong!", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('competition_entries')
        .update({
          full_name: profileForm.full_name,
          school_name: profileForm.school_name,
          school: profileForm.school_name, // Sinkronisasi kolom 'school' lama demi integritas modul lain
          phone: profileForm.phone,
          nisn: profileForm.nisn,
          province: profileForm.province,
          team_name: profileForm.team_name,
          participant2_name: profileForm.participant2_name,
          participant2_nisn: profileForm.participant2_nisn
        })
        .eq('id', userEntry?.id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Izin update ditolak. Pastikan skrip SQL RLS sudah dijalankan di Supabase SQL Editor.");
      }
      
      showToast("Profil berhasil diperbarui!", "success");
      setUserEntry((prev: any) => ({
        ...prev,
        ...profileForm,
        school: profileForm.school_name // Sync state lokal juga!
      }));
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error("DEBUG FAIL UPDATE PROFILE:", err);
      showToast(`Gagal: ${err.message || "Akses RLS ditolak (Pastikan SQL sudah dijalankan)"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSubmissionUrl = async () => {
    if (!submissionUrl) return showToast("Masukkan link Google Drive Anda terlebih dahulu!", "error");
    setIsSavingUrl(true);
    try {
      let notesObj: any = {};
      if (userEntry?.notes) {
        try { notesObj = JSON.parse(userEntry.notes); } catch (e) {}
      }
      notesObj.submission_url = submissionUrl;
      const updatedNotes = JSON.stringify(notesObj);

      const { error } = await supabase.from('competition_entries').update({ notes: updatedNotes }).eq('id', userEntry?.id);
      if (error) throw error;
      
      showToast("Link karya berhasil disimpan!", "success");
      setUserEntry((prev: any) => ({ ...prev, notes: updatedNotes }));
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, "error");
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleResubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('competition_entries')
        .update({ payment_status: 'Pending' })
        .eq('id', userEntry?.id);
      if (error) throw error;
      showToast("Berkas berhasil diajukan ulang ke antrean verifikasi!", "success");
      setUserEntry((prev: any) => ({ ...prev, payment_status: 'Pending' }));
    } catch (err: any) {
      showToast(`Gagal mengajukan ulang: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFile) return showToast("Mohon pilih file bukti transfer terlebih dahulu!", "error");
    if (paymentFile.size > 2 * 1024 * 1024) { 
      return showToast("Ukuran foto maksimal 2MB!", "error");
    }

    setIsUploadingPayment(true);
    try {
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${userEntry?.id}-payment-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('competition_entries')
        .update({
          payment_proof_url: photoUrl,
          payment_status: 'Pending'
        })
        .eq('id', userEntry?.id);

      if (dbError) throw dbError;

      showToast("Bukti transfer berhasil diunggah! Menunggu verifikasi admin.", "success");
      setUserEntry((prev: any) => ({
        ...prev,
        payment_proof_url: photoUrl,
        payment_status: 'Pending'
      }));
      setPaymentFile(null);
    } catch (err: any) {
      console.error("Upload payment error:", err);
      let errMsg = err.message || "Kesalahan tidak dikenal";
      if (errMsg.toLowerCase().includes("bucket") || errMsg.toLowerCase().includes("not_found") || errMsg.toLowerCase().includes("not found")) {
        errMsg = "Bucket 'payment-proofs' tidak ditemukan di database Supabase. Silakan hubungi admin untuk menjalankan migrasi database/storage.";
      }
      showToast(`Gagal mengunggah bukti: ${errMsg}`, "error");
    } finally {
      setIsUploadingPayment(false);
    }
  };

  // Deteksi stage dan status kelulusan dari notes
  let currentStage = 1;
  let isFailed = false;
  if (userEntry?.notes) {
    try {
      const notesObj = JSON.parse(userEntry.notes);
      if (notesObj.current_stage) currentStage = Number(notesObj.current_stage);
      if (notesObj.is_failed) isFailed = Boolean(notesObj.is_failed);
    } catch (e) {}
  }

  // Cek apakah wajib bayar di tahap ini
  let isPaymentRequired = true;
  if (paymentRequirementStage === 'registration') {
    isPaymentRequired = true;
  } else if (paymentRequirementStage === 'tahap1') {
    isPaymentRequired = currentStage >= 2 && !isFailed;
  } else if (paymentRequirementStage === 'tahap2') {
    isPaymentRequired = currentStage >= 3 && !isFailed;
  } else if (paymentRequirementStage === 'free') {
    isPaymentRequired = false;
  }

  return (
    <div className="space-y-6">
      
      {!userEntry && (
        <div className="bg-white border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-500" />
            Langkah Selanjutnya
          </h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="font-medium text-green-800">Lengkapi Profil Biodata</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
              <Clock size={16} className="text-amber-500" />
              <span className="font-medium text-amber-800">Unggah Bukti Transfer</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (isRegEffectiveOpen) {
                setShowForm(true);
              } else {
                const hasAnyActive = portalWaves.some((w: any) => w.status === "Aktif");
                if (!hasAnyActive && portalWaves.length > 0) {
                  showToast("Semua gelombang pendaftaran telah ditutup oleh Admin.", "error");
                } else {
                  showToast("Pendaftaran ditutup sementara oleh Admin.", "error");
                }
              }
            }}
            disabled={!isRegEffectiveOpen}
            className={`w-full mt-6 font-bold py-3 rounded-xl transition-all shadow-md text-sm ${
              isRegEffectiveOpen 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:scale-[1.02]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      )}

      {userEntry?.payment_status === 'Pending' && (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-amber-200 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl"><Clock size={24} className="text-white" /></div>
            <h3 className="font-bold text-lg">Proses Verifikasi</h3>
          </div>
          <p className="text-sm text-amber-50 font-medium leading-relaxed mb-4">
            Berkas pendaftaran <strong className="text-white underline">{userEntry?.competition_type || userEntry?.category || "Kompetisi"}</strong> Anda sedang diperiksa oleh Markas Besar. 
          </p>
          <div className="bg-black/10 rounded-xl p-3 text-xs font-bold uppercase tracking-wider text-center border border-white/20">
            Mohon Tunggu 1x24 Jam
          </div>
        </div>
      )}

      {userEntry?.payment_status === 'Rejected' && (
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-lg shadow-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={24} />
            <h3 className="font-bold text-lg">Pendaftaran Ditolak</h3>
          </div>
          <p className="text-sm text-rose-50 font-medium leading-relaxed mb-4">
            Mohon maaf, berkas Anda ditolak. Silakan periksa kembali data dan bukti pembayaran Anda.
          </p>
          <button onClick={handleResubmit} disabled={isSubmitting} className="w-full bg-white text-rose-600 font-bold py-2.5 rounded-xl text-sm">
            {isSubmitting ? "Memproses..." : "Ajukan Ulang Berkas"}
          </button>
        </div>
      )}

      {userEntry && userEntry.payment_status !== 'Verified' && userEntry.payment_status !== 'Pending' && userEntry.payment_status !== 'Rejected' && (
        isPaymentRequired ? (
          <div className="bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 border-2 border-indigo-100/80 shadow-[0_12px_40px_rgba(79,70,229,0.08)] rounded-[28px] p-6 relative overflow-hidden group transition-all">
            {/* Colorful Dynamic Glowing Blobs */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-400/15 to-blue-400/15 rounded-full blur-xl pointer-events-none"></div>

            {/* Header Badge & Title */}
            <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight leading-tight">Pembayaran Lomba</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Verifikasi Berkas & Tagihan</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm shadow-indigo-200">
                Wajib
              </span>
            </div>

            {/* Dynamic Custom Description */}
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-4 relative z-10">
              {(() => {
                const defaultDesc = "Untuk mengaktifkan kepesertaan Anda di cabang {category}, silakan lakukan transfer administrasi pendaftaran:";
                const rawDesc = dynamicPaymentConfig?.description || defaultDesc;
                const catName = userEntry.competition_type || userEntry.category || "Kompetisi";
                return rawDesc.replace("{category}", catName);
              })()}
            </p>

            {/* Modern Colorful Bank Info Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4.5 border border-indigo-500/20 shadow-xl shadow-indigo-950/10 space-y-3.5 mb-4 relative overflow-hidden">
              {/* Card Hologram Line */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

              {/* Bank & Badge */}
              <div className="flex justify-between items-center text-xs relative z-10">
                <span className="text-indigo-200/80 font-medium text-[11px]">Bank Tujuan</span>
                <span className="font-black text-white flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black text-[9px] rounded-md tracking-wider shadow-xs">
                    {dynamicPaymentConfig?.bankBadge || "MANDIRI"}
                  </span>
                  {dynamicPaymentConfig?.bankName || "Bank Mandiri"}
                </span>
              </div>

              {/* Account Number */}
              <div className="flex justify-between items-center text-xs relative z-10 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                <span className="text-indigo-200/80 font-medium text-[11px]">No. Rekening</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
                    {dynamicPaymentConfig?.accountNumber || "123-456-789-0123"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      const num = (dynamicPaymentConfig?.accountNumber || "1234567890123").replace(/[^0-9]/g, '');
                      navigator.clipboard.writeText(num);
                      showToast("Nomor rekening berhasil disalin!", "success");
                    }}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all active:scale-90"
                    title="Salin Nomor Rekening"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {/* Account Holder */}
              <div className="flex justify-between items-center text-xs relative z-10">
                <span className="text-indigo-200/80 font-medium text-[11px]">Atas Nama</span>
                <span className="font-bold text-white text-right truncate max-w-[190px]">
                  {dynamicPaymentConfig?.accountHolder || "Panitia National Creativity Competition"}
                </span>
              </div>

              {/* Total Amount */}
              <div className="flex justify-between items-center pt-2.5 border-t border-white/15 relative z-10">
                <span className="text-indigo-200/80 font-medium text-[11px]">Biaya Pendaftaran</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-400 text-base">
                    {dynamicPaymentConfig?.amountFormatted || "Rp 150.000"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      const amountVal = String(dynamicPaymentConfig?.amount || 150000);
                      navigator.clipboard.writeText(amountVal);
                      showToast("Nominal pembayaran disalin!", "success");
                    }}
                    className="p-1 bg-white/20 hover:bg-white/30 rounded-md text-white transition-all active:scale-90"
                    title="Salin Nominal"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Drag and Drop Uploader */}
            <form onSubmit={handleUploadPaymentProof} className="space-y-3 relative z-10">
              <div className="relative">
                <div className={`border-2 border-dashed rounded-2xl p-4.5 text-center transition-all cursor-pointer relative ${
                  paymentFile 
                    ? 'border-emerald-400 bg-emerald-50/50 shadow-sm shadow-emerald-100' 
                    : 'border-indigo-200/80 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40'
                }`}>
                  <input 
                    required 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                      paymentFile 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-indigo-600 text-white shadow-indigo-200'
                    }`}>
                      {paymentFile ? <CheckCircle2 size={18} /> : <Upload size={18} />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${paymentFile ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {paymentFile ? paymentFile.name : "Unggah Bukti Transfer"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                        Format gambar (JPG, PNG). Maksimal 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploadingPayment} 
                className="w-full bg-gradient-to-r from-[#5145cd] via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
              >
                {isUploadingPayment ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Memproses Bukti...
                  </>
                ) : (
                  "KIRIM BUKTI PEMBAYARAN"
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Deferred Payment Note */
          <div className="bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border border-slate-200/60 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm">Status Pembayaran</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded">Bebas Administrasi</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Ditangguhkan (Belum Wajib). Tahap kompetisi aktif saat ini dibebaskan dari biaya pendaftaran. Silakan lanjutkan pengerjaan berkas atau persiapan ujian Anda secara penuh!
            </p>
          </div>
        )
      )}

      {userEntry && (
        <div id="profile-preview-card" className="bg-white border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 transition-all duration-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              Pratinjau Profil
            </h3>
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all">
              {isEditingProfile ? "Batal" : "Ubah Profil"}
            </button>
          </div>

          {!isEditingProfile ? (
            <div className="space-y-3 text-xs">

              {/* ── ID TIKET CBT ─────────────────────────────── */}
              {userEntry.id && (() => {
                const ticketCode = `NCC-${generateTicketCode(userEntry.id)}`;
                const handleCopy = () => {
                  navigator.clipboard.writeText(ticketCode).then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  });
                };
                return (
                  <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 overflow-hidden">
                    {/* Label baris atas */}
                    <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                      <Ticket size={11} className="text-indigo-400 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">ID Tiket Login CBT</span>
                    </div>
                    {/* Kode + tombol salin */}
                    <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                      <span className="font-mono font-black text-lg tracking-[0.15em] text-indigo-700 whitespace-nowrap select-all">
                        {ticketCode}
                      </span>
                      <button
                        onClick={handleCopy}
                        title="Salin ID Tiket"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shrink-0 ${
                          isCopied
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                        }`}
                      >
                        {isCopied
                          ? <><Check size={12} /> Tersalin!</>
                          : <><Copy size={12} /> Salin</>}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {[
                ...((userEntry.competition_type === "LKTI Nasional" || userEntry.category === "LKTI Nasional") ? [
                  { label: "Nama Ketua (Anggota 1)", value: userEntry.full_name },
                  { label: "Nama Tim", value: userEntry.team_name },
                  { label: "NISN Ketua", value: userEntry.nisn }
                ] : [
                  { label: "Nama Lengkap", value: userEntry.full_name },
                  { label: "NISN", value: userEntry.nisn }
                ]),
                { label: "Asal Sekolah", value: userEntry.school_name || userEntry.school },
                { label: "WhatsApp", value: userEntry.phone },
                { label: "Provinsi", value: userEntry.province },
                // Tambahkan data Anggota 2 jika kategori Tim
                ...((userEntry.competition_type === "LKTI Nasional" || userEntry.category === "LKTI Nasional") ? [
                  { label: "Nama Anggota Tim", value: userEntry.participant2_name },
                  { label: "NISN Anggota Tim", value: userEntry.participant2_nisn }
                ] : [])
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-slate-400 font-medium">{item.label}</span>
                  <span className="text-slate-800 font-bold">{item.value || "-"}</span>
                </div>
              ))}

              <div className="pt-4 mt-2 border-t-2 border-dashed border-slate-100 space-y-4">
                {(() => {
                  let n: any = {}; 
                  if (userEntry.notes) {
                    try { n = JSON.parse(userEntry.notes); } catch(e) {}
                  }
                  
                  const isTeam = userEntry.competition_type === "LKTI Nasional" || 
                                 userEntry.category === "LKTI Nasional";

                  return (
                    <>
                      {/* 1. Instagram Proof */}
                      <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-100">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon size={12} className="text-pink-500" /> Bukti Follow Instagram
                        </label>
                        <div className="flex items-center gap-2">
                          {n.instagram_follow_url ? (
                            <div className="flex justify-between items-center w-full">
                              <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[200px]">Bukti_Instagram.png</span>
                              <div className="flex gap-1 shrink-0">
                                <a href={n.instagram_follow_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                <button type="button" onClick={() => handleRemoveFile('instagram_follow_url')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                              </div>
                            </div>
                          ) : (
                            <input type="file" accept="image/*" onChange={(e) => setInstagramFollow(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-pink-50 file:text-pink-600 cursor-pointer" />
                          )}
                        </div>
                      </div>

                      {/* 2. Berkas Ketua / Peserta 1 */}
                      <div className="space-y-3 pb-2 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isTeam ? "Berkas Ketua Tim (Peserta 1)" : "Berkas Utama Peserta"}</p>
                        
                        {/* Foto Formal */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Foto Formal</label>
                          <div className="flex items-center gap-2">
                            {n.profile_photo_url ? (
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Foto_Formal.png</span>
                                <div className="flex gap-1 shrink-0">
                                  <a href={n.profile_photo_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                  <button type="button" onClick={() => handleRemoveFile('profile_photo_url')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                </div>
                              </div>
                            ) : (
                              <input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 cursor-pointer" />
                            )}
                          </div>
                        </div>

                        {/* Kartu Pelajar */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Kartu Pelajar</label>
                          <div className="flex items-center gap-2">
                            {n.student_card_url ? (
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Kartu_Pelajar.png</span>
                                <div className="flex gap-1 shrink-0">
                                  <a href={n.student_card_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                  <button type="button" onClick={() => handleRemoveFile('student_card_url')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                </div>
                              </div>
                            ) : (
                              <input type="file" accept="image/*" onChange={(e) => setStudentCard(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-600 cursor-pointer" />
                            )}
                          </div>
                        </div>

                        {/* Twibbon */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Twibbon (Opsional)</label>
                          <div className="flex items-center gap-2">
                            {n.twibbon_url ? (
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Twibbon.png</span>
                                <div className="flex gap-1 shrink-0">
                                  <a href={n.twibbon_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                  <button type="button" onClick={() => handleRemoveFile('twibbon_url')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                </div>
                              </div>
                            ) : (
                              <input type="file" accept="image/*" onChange={(e) => setTwibbon(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 cursor-pointer" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Berkas Anggota 2 */}
                      {isTeam && (
                        <div className="space-y-3 pb-2 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Berkas Anggota 2</p>

                          {/* Foto Formal 2 */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Foto Formal</label>
                            <div className="flex items-center gap-2">
                              {n.profile_photo_url2 ? (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Foto_Formal_Anggota2.png</span>
                                  <div className="flex gap-1 shrink-0">
                                    <a href={n.profile_photo_url2} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                    <button type="button" onClick={() => handleRemoveFile('profile_photo_url2')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                  </div>
                                </div>
                              ) : (
                                <input type="file" accept="image/*" onChange={(e) => setProfilePhoto2(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 cursor-pointer" />
                              )}
                            </div>
                          </div>

                          {/* Kartu Pelajar 2 */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Kartu Pelajar</label>
                            <div className="flex items-center gap-2">
                              {n.student_card_url2 ? (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Kartu_Pelajar_Anggota2.png</span>
                                  <div className="flex gap-1 shrink-0">
                                    <a href={n.student_card_url2} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                    <button type="button" onClick={() => handleRemoveFile('student_card_url2')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                  </div>
                                </div>
                              ) : (
                                <input type="file" accept="image/*" onChange={(e) => setStudentCard2(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-600 cursor-pointer" />
                              )}
                            </div>
                          </div>

                          {/* Twibbon 2 */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase px-0.5">Twibbon (Opsional)</label>
                            <div className="flex items-center gap-2">
                              {n.twibbon_url2 ? (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[9px] text-slate-500 font-semibold truncate max-w-[200px]">Twibbon_Anggota2.png</span>
                                  <div className="flex gap-1 shrink-0">
                                    <a href={n.twibbon_url2} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">Lihat</a>
                                    <button type="button" onClick={() => handleRemoveFile('twibbon_url2')} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Hapus</button>
                                  </div>
                                </div>
                              ) : (
                                <input type="file" accept="image/*" onChange={(e) => setTwibbon2(e.target.files?.[0] || null)} className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-purple-50 file:text-purple-600 cursor-pointer" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {(profilePhoto || studentCard || twibbon || instagramFollow || profilePhoto2 || studentCard2 || twibbon2) && (
                  <button 
                    onClick={handleUploadProfileFiles} 
                    disabled={isUploadingFiles} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md mt-2 flex items-center justify-center gap-1.5"
                  >
                    {isUploadingFiles ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Mengunggah Berkas Baru...
                      </>
                    ) : (
                      "Simpan Berkas Baru"
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <input 
                type="text" 
                placeholder={(userEntry.competition_type === "LKTI Nasional" || userEntry.category === "LKTI Nasional") ? "Nama Ketua (Anggota 1)" : "Nama Lengkap"} 
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold" 
                value={profileForm.full_name} 
                onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})} 
              />
              <input type="text" placeholder="Sekolah" className="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold" value={profileForm.school_name} onChange={(e) => setProfileForm({...profileForm, school_name: e.target.value})} />
              <input type="text" placeholder="WhatsApp" className="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder={(userEntry.competition_type === "LKTI Nasional" || userEntry.category === "LKTI Nasional") ? "NISN Ketua" : "NISN"} 
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold" 
                  value={profileForm.nisn} 
                  onChange={(e) => setProfileForm({...profileForm, nisn: e.target.value})} 
                />
                <select 
                  value={profileForm.province || ""} 
                  onChange={(e) => setProfileForm({...profileForm, province: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold text-slate-600 outline-none cursor-pointer"
                >
                  <option value="" disabled>Pilih Provinsi...</option>
                  <option value="Aceh">Aceh</option>
                  <option value="Sumatera Utara">Sumatera Utara</option>
                  <option value="Sumatera Barat">Sumatera Barat</option>
                  <option value="Riau">Riau</option>
                  <option value="Kepulauan Riau">Kepulauan Riau</option>
                  <option value="Jambi">Jambi</option>
                  <option value="Bengkulu">Bengkulu</option>
                  <option value="Sumatera Selatan">Sumatera Selatan</option>
                  <option value="Kepulauan Bangka Belitung">Kepulauan Bangka Belitung</option>
                  <option value="Lampung">Lampung</option>
                  <option value="Banten">Banten</option>
                  <option value="DKI Jakarta">DKI Jakarta</option>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Jawa Tengah">Jawa Tengah</option>
                  <option value="DI Yogyakarta">DI Yogyakarta</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="Bali">Bali</option>
                  <option value="Nusa Tenggara Barat">Nusa Tenggara Barat</option>
                  <option value="Nusa Tenggara Timur">Nusa Tenggara Timur</option>
                  <option value="Kalimantan Barat">Kalimantan Barat</option>
                  <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                  <option value="Kalimantan Selatan">Kalimantan Selatan</option>
                  <option value="Kalimantan Timur">Kalimantan Timur</option>
                  <option value="Kalimantan Utara">Kalimantan Utara</option>
                  <option value="Sulawesi Utara">Sulawesi Utara</option>
                  <option value="Gorontalo">Gorontalo</option>
                  <option value="Sulawesi Tengah">Sulawesi Tengah</option>
                  <option value="Sulawesi Barat">Sulawesi Barat</option>
                  <option value="Sulawesi Selatan">Sulawesi Selatan</option>
                  <option value="Sulawesi Tenggara">Sulawesi Tenggara</option>
                  <option value="Maluku Utara">Maluku Utara</option>
                  <option value="Maluku">Maluku</option>
                  <option value="Papua Barat">Papua Barat</option>
                  <option value="Papua Barat Daya">Papua Barat Daya</option>
                  <option value="Papua">Papua</option>
                  <option value="Papua Tengah">Papua Tengah</option>
                  <option value="Papua Pegunungan">Papua Pegunungan</option>
                  <option value="Papua Selatan">Papua Selatan</option>
                </select>
              </div>
              
              {/* Form Tambahan Anggota 2 jika kategori Tim */}
              {(userEntry.competition_type === "LKTI Nasional" || userEntry.category === "LKTI Nasional") && (
                <div className="pt-2 space-y-2 border-t border-dashed border-slate-200 mt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Tim & Anggota 2</p>
                  <input type="text" placeholder="Nama Tim" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" value={profileForm.team_name} onChange={(e) => setProfileForm({...profileForm, team_name: e.target.value})} />
                  <input type="text" placeholder="Nama Anggota 2" className="w-full p-2.5 bg-slate-50 border rounded-xl" value={profileForm.participant2_name} onChange={(e) => setProfileForm({...profileForm, participant2_name: e.target.value})} />
                  <input type="text" placeholder="NISN Anggota 2" className="w-full p-2.5 bg-slate-50 border rounded-xl" value={profileForm.participant2_nisn} onChange={(e) => setProfileForm({...profileForm, participant2_nisn: e.target.value})} />
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl">Simpan</button>
            </form>
          )}
        </div>
      )}

      {(userEntry?.payment_status === 'Verified' || (!isPaymentRequired && !isFailed)) && (
        <div className="bg-white border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FolderOpen size={18} className={!isSubmissionOpen ? "text-slate-400" : (savedSubmissionUrl && !isEditingSubmission ? "text-emerald-500" : "text-blue-500")} />
            Pengumpulan Karya {activeSubmissionWave ? `(${activeSubmissionWave})` : ""}
          </h3>

          {!isSubmissionOpen ? (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col items-center gap-3 p-5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                  <Lock size={20} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-700">Akses Pengumpulan Ditutup</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed max-w-[220px] mx-auto">
                    Portal pengumpulan karya Gelombang I & II untuk kategori <span className="font-bold text-indigo-600">{userEntry.competition_type || userEntry.category}</span> saat ini sedang ditutup.
                  </p>
                </div>
              </div>
            </div>
          ) : savedSubmissionUrl && !isEditingSubmission ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-emerald-700">Karya Berhasil Dikumpulkan!</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link yang Dikumpulkan</p>
                <a 
                  href={savedSubmissionUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-blue-600 font-semibold break-all hover:underline line-clamp-2"
                >
                  {savedSubmissionUrl}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setIsEditingSubmission(true)} 
                  className="w-full border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  Ubah Link
                </button>
                <button 
                  disabled 
                  className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-default"
                >
                  <CheckCircle2 size={13} /> Sudah Submit
                </button>
              </div>
            </div>
          ) : (
            /* 📝 FORM INPUT STATE */
            <div className="space-y-3">
              {!savedSubmissionUrl && (
                <p className="text-[11px] text-slate-500 font-medium">Kumpulkan link Google Drive karya Anda di sini.</p>
              )}
              {isEditingSubmission && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={13} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] font-bold text-amber-700">Mengubah link akan mengganti karya sebelumnya.</p>
                </div>
              )}
              <input 
                type="url" 
                placeholder="https://drive.google.com/..." 
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-semibold text-slate-700" 
                value={submissionUrl} 
                onChange={(e) => setSubmissionUrl(e.target.value)} 
              />
              <div className="grid grid-cols-2 gap-2">
                {isEditingSubmission && (
                  <button 
                    onClick={() => { setIsEditingSubmission(false); setSubmissionUrl(savedSubmissionUrl); }} 
                    className="w-full border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button 
                  onClick={async () => { await handleSaveSubmissionUrl(); setIsEditingSubmission(false); }} 
                  disabled={isSavingUrl || !submissionUrl} 
                  className={`w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors ${
                    isEditingSubmission ? '' : 'col-span-2'
                  }`}
                >
                  {isSavingUrl ? "Menyimpan..." : isEditingSubmission ? "Simpan Perubahan" : "Simpan Link Karya"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      <div className="grid grid-cols-1 gap-4">
        {(() => {
          // Map kategori lomba ke file juknis PDF
          const getJuknisUrl = () => {
            const cat = (userEntry?.competition_type || userEntry?.category || '').toLowerCase();
            if (cat.includes('lkti')) return '/juknis/juknis-lkti.pdf';
            if (cat.includes('mipa') || cat.includes('olimpiade')) return '/juknis/juknis-olimpiade-mipa.pdf';
            if (cat.includes('speech')) return '/juknis/juknis-speech.pdf';
            if (cat.includes('mtq')) return '/juknis/juknis-mtq.pdf';
            return null;
          };
          const juknisUrl = getJuknisUrl();
          const juknisLabel = userEntry?.competition_type || userEntry?.category || 'Lomba';

          // Map kategori lomba ke CP WhatsApp (dari Juknis resmi) — bisa lebih dari 1 CP
          const getWhatsAppCPs = (): { name: string; phone: string }[] => {
            const cat = (userEntry?.competition_type || userEntry?.category || '').toLowerCase();
            if (cat.includes('lkti')) return [{ name: 'Rizki Yudha Sentika, M.Pd', phone: '6285746460644' }];
            if (cat.includes('mipa') || cat.includes('olimpiade')) return [
              { name: 'Yudha Kristiawan, M.Pd', phone: '6281331374833' },
              { name: 'Putri Setyaningati N, S.Pd', phone: '6285730034516' },
            ];
            if (cat.includes('speech')) return [{ name: 'Rizkia Putri Perdana, S.Pd', phone: '6285649603868' }];
            if (cat.includes('mtq')) return [{ name: 'Herina Jum\'atin Ayuningrum, S.Pd.I. M.Pd', phone: '6281233882731' }];
            return [];
          };
          const cpList = getWhatsAppCPs();

          // Tentukan scope peserta berdasarkan cabang lomba
          const participantScope = (() => {
            const cat = (userEntry?.competition_type || userEntry?.category || '').toLowerCase();
            if (cat.includes('lkti')) return 'lkti';
            if (cat.includes('mipa') || cat.includes('olimpiade')) return 'mipa';
            if (cat.includes('speech')) return 'speech';
            if (cat.includes('mtq')) return 'mtq';
            return 'all';
          })();

          // Rekonstruksi list grup dari dynamicGroupLinks (format: {id: url, id_label: label, id_scope: scope})
          const allGroupKeys = Object.keys(dynamicGroupLinks).filter(
            k => !k.endsWith('_label') && !k.endsWith('_scope') && k !== 'updatedAt' && dynamicGroupLinks[k]
          );
          const matchedGroups = allGroupKeys
            .map(k => ({
              label: dynamicGroupLinks[`${k}_label`] || k,
              url: dynamicGroupLinks[k],
              scope: dynamicGroupLinks[`${k}_scope`] || 'all',
            }))
            .filter(g => g.scope === 'all' || g.scope === participantScope);

          const items = [
            { 
              label: "Buku Panduan", 
              sub: juknisUrl ? `Juknis ${juknisLabel} (PDF)` : "Syarat & Ketentuan Lomba (PDF)", 
              icon: BookOpen, 
              color: "blue",
              href: juknisUrl || "#"
            },
            // Tampilkan semua grup WA yang match scope peserta
            ...matchedGroups.map(g => ({
              label: g.label,
              sub: "Bergabung ke grup WhatsApp resmi",
              icon: MessageCircle,
              color: "emerald",
              href: g.url,
            })),
            { label: "Twibbon Resmi", sub: "Pasang twibbon NCC 13th sekarang!", icon: ImageIcon, color: "purple", href: "https://twb.nz/nationalcreativitycompetition" },
            // Generate 1 atau lebih tombol CP sesuai jumlah CP di juknis
            ...(cpList.length > 0
              ? cpList.map((cp, idx) => ({
                  label: cpList.length > 1 ? `Hubungi Panitia ${idx + 1}` : "Hubungi Panitia",
                  sub: `CP: ${cp.name}`,
                  icon: MessageCircle,
                  color: "green",
                  href: makeWaUrl(cp.phone),
                }))
              : [{ label: "Hubungi Panitia", sub: "Bantuan via WhatsApp", icon: MessageCircle, color: "green", href: "#" }]
            ),
          ];

          return items.map((item, i) => (
            <a 
              key={i} 
              href={item.href} 
              target={item.href !== '#' ? '_blank' : undefined}
              rel={item.href !== '#' ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all shadow-sm group relative overflow-hidden"
            >
              {item.label === "Buku Panduan" && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-600"
                  />
                </div>
              )}
              <div className={`w-12 h-12 bg-${item.color}-100 text-${item.color}-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all`}>
                <item.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{item.label}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>
              </div>
            </a>
          ));
        })()}

        {/* ── DYNAMIC REGISTRATION CARD INTEGRATED WITH ADMIN GATE ── */}
        {!userEntry ? (
          isRegEffectiveOpen ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center text-left gap-4 p-5 bg-gradient-to-r from-[#5145cd] to-[#372b9c] border border-transparent hover:from-[#4338ca] hover:to-[#2e2285] text-white rounded-2xl transition-all shadow-lg hover:shadow-indigo-200/50 shadow-indigo-100 group relative overflow-hidden w-full"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform translate-x-5 -translate-y-5"></div>
              <div className="w-12 h-12 bg-white/15 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shrink-0">
                <Target size={24} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  Pendaftaran Kompetisi - {waveNameClean} <Sparkles size={14} className="text-amber-300 animate-bounce" />
                </h4>
                <p className="text-[11px] text-indigo-100 mt-0.5 font-medium">Pilih bidang lomba & daftar {waveNameClean} sekarang</p>
              </div>
              <ChevronRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          ) : (
            <div
              className="flex items-center text-left gap-4 p-5 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl cursor-not-allowed select-none opacity-80 w-full shadow-inner"
              title={
                portalWaves.length > 0 && !portalWaves.some((w: any) => w.status === "Aktif")
                  ? "Semua gelombang pendaftaran telah ditutup"
                  : "Pendaftaran ditutup sementara oleh admin"
              }
            >
              <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm text-slate-700">Pendaftaran Ditutup</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                  {portalWaves.length > 0 && !portalWaves.some((w: any) => w.status === "Aktif")
                    ? "Semua gelombang pendaftaran telah ditutup"
                    : "Gerbang pendaftaran dinonaktifkan sementara"}
                </p>
              </div>
            </div>
          )
        ) : (
          <button
            onClick={() => {
              setIsEditingProfile(true);
              const element = document.getElementById("profile-preview-card");
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                // Flash highlight effect
                element.classList.add("ring-4", "ring-indigo-500/50");
                setTimeout(() => element.classList.remove("ring-4", "ring-indigo-500/50"), 2000);
              }
            }}
            className="flex items-center text-left gap-4 p-5 bg-white border border-emerald-200 hover:border-emerald-300 rounded-2xl transition-all shadow-sm group relative overflow-hidden w-full"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500"></div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                Status: Terdaftar <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-emerald-100 text-emerald-700 uppercase">{userEntry.payment_status}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Terdaftar di bidang: <span className="font-bold text-slate-600">{userEntry.competition_type || userEntry.category}</span></p>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        )}
      </div>
      {/* 🌟 PREMIUM GLASSMORPHIC OVERLAY FOR SUBMITTING & SAVING KARYA / BUKTI TF */}
      {(isSavingUrl || isUploadingPayment || isSubmitting) && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative flex flex-col items-center p-8 rounded-[2rem] bg-white/15 border border-white/20 shadow-2xl max-w-sm w-full text-center">
            {/* Spinning glowing gradient ring */}
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-teal-500 animate-spin"></div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                {isSavingUrl ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 animate-bounce">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3-3m0 0l3 3m-3-3v12" />
                  </svg>
                ) : isUploadingPayment ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 animate-bounce">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 animate-spin">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
              </div>
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-tight">
              {isSavingUrl ? "Menyimpan Karya..." : isUploadingPayment ? "Mengunggah Bukti Pembayaran..." : "Mengupdate Profil..."}
            </h3>
            <p className="text-xs text-indigo-200 font-medium leading-relaxed">
              {isSavingUrl 
                ? "Sedang menautkan link karya pendaftaran Anda ke database utama." 
                : isUploadingPayment
                ? "Sedang mengunggah file bukti pembayaran Anda ke server penyimpanan aman."
                : "Mohon tunggu sebentar, sedang menyimpan pembaruan profil Anda."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
