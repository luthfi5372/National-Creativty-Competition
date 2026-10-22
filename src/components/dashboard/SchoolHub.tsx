"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Users, Send, Building2, ShieldAlert, Award, Loader2, CheckCircle2, ChevronRight, Camera, ImageIcon, Pencil, Trash2, Forward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface SchoolHubProps {
  userEntry: any;
  currentUser: any;
}

export default function SchoolHub({ userEntry, currentUser }: SchoolHubProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "schoolmates">("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [schoolmates, setSchoolmates] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMates, setIsLoadingMates] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);

  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // WA-like features states
  const [editingMsg, setEditingMsg] = useState<any | null>(null);
  const [editInput, setEditInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const [canonicalSchool, setCanonicalSchool] = useState<string>("");
  const [canonicalNpsn, setCanonicalNpsn] = useState<string>("");

  // Ambil school_name CANONICAL langsung dari competition_entries via user_id
  // Ini memastikan nama sekolah selalu sama dengan yang ada di database,
  // tidak peduli apa yang user tulis di form registrasi
  useEffect(() => {
    const fetchCanonicalSchool = async () => {
      if (!currentUser?.id) {
        // Fallback ke userEntry jika tidak ada user_id
        setCanonicalSchool(
          (userEntry?.school_name || userEntry?.school || currentUser?.user_metadata?.school || "").trim()
        );
        setCanonicalNpsn((userEntry?.npsn || currentUser?.user_metadata?.npsn || "").trim());
        return;
      }

      try {
        const { data, error } = await supabase
          .from("competition_entries")
          .select("school_name, school, npsn")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const name = (data.school_name || data.school || "").trim();
          const npsn = (data.npsn || "").trim();
          setCanonicalSchool(name);
          setCanonicalNpsn(npsn);
        } else {
          // Fallback ke userEntry prop jika query gagal
          setCanonicalSchool(
            (userEntry?.school_name || userEntry?.school || currentUser?.user_metadata?.school || "").trim()
          );
          setCanonicalNpsn((userEntry?.npsn || currentUser?.user_metadata?.npsn || "").trim());
        }
      } catch (err) {
        setCanonicalSchool(
          (userEntry?.school_name || userEntry?.school || currentUser?.user_metadata?.school || "").trim()
        );
        setCanonicalNpsn((userEntry?.npsn || currentUser?.user_metadata?.npsn || "").trim());
      }
    };

    fetchCanonicalSchool();
  }, [currentUser?.id, userEntry?.school_name, userEntry?.school, userEntry?.npsn]);

  // Gunakan canonical values sebagai active school/npsn
  const activeSchool = canonicalSchool;
  const activeNpsn = canonicalNpsn;

  useEffect(() => {
    if (schoolmates.length > 0) {
      let foundLogo = null;
      for (const mate of schoolmates) {
        if (mate.notes) {
          try {
            const parsed = JSON.parse(mate.notes);
            if (parsed.school_logo_url) {
              foundLogo = parsed.school_logo_url;
              break;
            }
          } catch (e) {}
        }
      }
      setSchoolLogo(foundLogo);
    }
  }, [schoolmates]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran logo maksimal 2MB!");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `school-logo-${activeNpsn || 'general'}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
      const logoUrl = urlData.publicUrl;

      // Update current user's competition entry notes
      let notesObj: any = {};
      if (userEntry?.notes) {
        try { notesObj = JSON.parse(userEntry.notes); } catch (err) {}
      }
      notesObj.school_logo_url = logoUrl;
      const updatedNotes = JSON.stringify(notesObj);

      const { error: dbError } = await supabase
        .from('competition_entries')
        .update({ notes: updatedNotes })
        .eq('id', userEntry?.id);

      if (dbError) throw dbError;

      setSchoolLogo(logoUrl);
      
      // Dynamically update schoolmates for local instantaneous rendering
      setSchoolmates(prev => 
        prev.map(mate => 
          mate.email === currentUser?.email 
            ? { ...mate, notes: updatedNotes } 
            : mate
        )
      );

      alert("Logo sekolah berhasil diunggah!");
    } catch (err: any) {
      console.error("Gagal mengunggah logo sekolah:", err);
      alert(`Gagal mengunggah logo: ${err.message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  // 1. Fetch & Subscribe to School Messages (Real-Time Group Chat)
  useEffect(() => {
    if (!activeSchool && !activeNpsn) return;

    const fetchMessages = async () => {
      setIsLoadingChats(true);
      setChatError(null);
      try {
        // Gunakan school_name (case-insensitive) sebagai identifier utama
        // NPSN bisa dipakai sebagai fallback jika school_name ada yang tidak cocok
        let data: any[] = [];
        let error: any = null;

        if (activeSchool) {
          // Prioritas 1: Fetch berdasarkan school_name (case-insensitive)
          const res = await supabase
            .from("school_messages")
            .select("*")
            .ilike("school_name", activeSchool.trim())
            .order("created_at", { ascending: true })
            .limit(100);
          data = res.data || [];
          error = res.error;

          // Jika tidak ada hasil dan ada NPSN, coba juga dengan NPSN
          if (!error && data.length === 0 && activeNpsn) {
            const res2 = await supabase
              .from("school_messages")
              .select("*")
              .eq("npsn", String(activeNpsn).trim())
              .order("created_at", { ascending: true })
              .limit(100);
            if (!res2.error && res2.data && res2.data.length > 0) {
              data = res2.data;
            }
          }
        } else if (activeNpsn) {
          // Fallback: Hanya pakai NPSN jika tidak ada school_name
          const res = await supabase
            .from("school_messages")
            .select("*")
            .eq("npsn", String(activeNpsn).trim())
            .order("created_at", { ascending: true })
            .limit(100);
          data = res.data || [];
          error = res.error;
        }

        if (error) {
          if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
            setChatError("TableNotCreated");
          } else {
            throw error;
          }
        } else {
          // Filter pesan uji coba / broadcast uji coba admin
          const cleaned = (data || []).filter((m: any) => {
            const txt = (m.message || '').toLowerCase();
            const sender = (m.sender_name || '').toLowerCase();
            if (txt.includes("gelombang pendaftaran sudah diaktifkan")) return false;
            if (txt.includes("harap lengkapi biodata pendaftaran")) return false;
            if (txt.includes("karya anda telah berhasil diverifikasi")) return false;
            if (sender.includes("markas besar") || m.sender_id === "hq-admin" || m.sender_id === "admin1") return false;
            if (sender.includes("jokowi") && txt.trim() === "ww") return false;
            return true;
          });
          setMessages(cleaned);
          
          // Bersihkan secara permanen di database di latar belakang
          import("@/app/actions/auth").then(mod => {
            if (mod.clearTestSchoolMessages) mod.clearTestSchoolMessages().catch(() => {});
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch school messages:", err);
        setChatError(err.message || "Gagal memuat obrolan.");
      } finally {
        setIsLoadingChats(false);
      }
    };

    fetchMessages();

    // Listen to real-time additions, updates, and deletes of messages for this school
    let channel: any;
    try {
      const channelKey = activeNpsn ? `npsn_${activeNpsn}` : activeSchool.replace(/\s+/g, "_");

      channel = supabase
        .channel(`school_chat_${channelKey}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events!
            schema: "public",
            table: "school_messages",
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && payload.old.id) {
                setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
              }
              return;
            }

            const newOrOld = payload.new || payload.old;
            if (!newOrOld) return;

            const matchesNpsn = activeNpsn && newOrOld.npsn && 
              String(newOrOld.npsn).trim() === String(activeNpsn).trim();
            const matchesSchool = activeSchool && newOrOld.school_name && 
              newOrOld.school_name.trim().toLowerCase() === activeSchool.trim().toLowerCase();

            if (matchesNpsn || matchesSchool) {
              if (payload.eventType === "INSERT") {
                const txt = (payload.new?.message || '').toLowerCase();
                const sender = (payload.new?.sender_name || '').toLowerCase();
                if (txt.includes("gelombang pendaftaran sudah diaktifkan") || txt.includes("harap lengkapi biodata pendaftaran") || sender.includes("markas besar") || (sender.includes("jokowi") && txt.trim() === "ww")) {
                  return;
                }
                setMessages((prev) => {
                  if (prev.some(m => m.id === payload.new.id)) return prev;
                  return [...prev, payload.new];
                });
              } else if (payload.eventType === "UPDATE") {
                setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Real-time subscription failed:", e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeSchool, activeNpsn]);

  // 2. Fetch Schoolmates & Kelolosan statuses
  useEffect(() => {
    if (!activeSchool && !activeNpsn) return;

    const fetchSchoolmates = async () => {
      setIsLoadingMates(true);
      try {
        let query = supabase
          .from("competition_entries")
          .select("id, user_id, full_name, email, competition_type, category, payment_status, notes");

        if (activeNpsn) {
          query = query.or(`npsn.eq."${activeNpsn}",school_name.eq."${activeSchool}",school.eq."${activeSchool}"`);
        } else {
          query = query.or(`school_name.eq."${activeSchool}",school.eq."${activeSchool}"`);
        }

        const { data, error } = await query
          .order("full_name", { ascending: true });

        if (error) throw error;
        setSchoolmates(data || []);
      } catch (err) {
        console.error("Failed to fetch schoolmates:", err);
      } finally {
        setIsLoadingMates(false);
      }
    };

    fetchSchoolmates();
  }, [activeSchool, activeNpsn]);

  // Handle send message with optimistic update
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || (!activeSchool && !activeNpsn)) return;

    setIsSending(true);
    const messageText = inputText.trim();
    setInputText("");

    // Optimistic update: tampilkan pesan langsung
    const senderName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Peserta NCC";
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      school_name: activeSchool,
      npsn: activeNpsn || null,
      sender_id: currentUser?.id,
      sender_name: senderName,
      message: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase
        .from("school_messages")
        .insert([
          {
            school_name: activeSchool,
            npsn: activeNpsn || null,
            sender_id: currentUser.id,
            sender_name: senderName,
            message: messageText,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      // Ganti pesan optimistic dengan data asli dari server
      if (data) {
        setMessages((prev) => prev.map((m) => m.id === optimisticId ? data : m));
      }
    } catch (err: any) {
      // Rollback optimistic update jika gagal
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(messageText); // Kembalikan teks ke input
      console.error("Failed to send message:", err);
      alert("Gagal mengirim pesan: " + (err.message || "Periksa koneksi dan data sekolah Anda."));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;
    try {
      const { error } = await supabase
        .from("school_messages")
        .delete()
        .eq("id", msgId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err: any) {
      alert("Gagal menghapus pesan: " + err.message);
    }
  };

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInput.trim() || !editingMsg || isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("school_messages")
        .update({ message: editInput.trim() })
        .eq("id", editingMsg.id);
      if (error) throw error;
      
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, message: editInput.trim() } : m));
      setEditingMsg(null);
      setEditInput("");
    } catch (err: any) {
      alert("Gagal memperbarui pesan: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForwardMessage = async (msgText: string) => {
    const cleanText = msgText.replace(/^↪ Diteruskan:\n/, "");
    const forwardedText = `↪ Diteruskan:\n${cleanText}`;
    
    try {
      const senderName = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Peserta NCC";
      const { error } = await supabase
        .from("school_messages")
        .insert([
          {
            school_name: activeSchool,
            npsn: activeNpsn || null,
            sender_id: currentUser.id,
            sender_name: senderName,
            message: forwardedText,
          }
        ]);
      if (error) throw error;
      alert("Pesan berhasil diteruskan!");
    } catch (err: any) {
      alert("Gagal meneruskan pesan: " + err.message);
    }
  };

  // Helper to parse stage progress
  const getProgressDetails = (entry: any) => {
    let stage = 1;
    let isFailed = false;
    if (entry.notes) {
      try {
        const n = JSON.parse(entry.notes);
        if (n.current_stage) stage = n.current_stage;
        if (n.is_failed) isFailed = n.is_failed;
      } catch (e) {}
    }

    if (stage === 1) {
      return isFailed 
        ? { text: "Gagal T1", color: "bg-rose-50 text-rose-600 border-rose-200" } 
        : { text: "Tahap 1", color: "bg-slate-100 text-slate-500 border-slate-200" };
    }
    if (stage === 2) {
      return isFailed 
        ? { text: "Gagal T2", color: "bg-rose-50 text-rose-600 border-rose-200" } 
        : { text: "Tahap 2", color: "bg-blue-50 text-blue-600 border-blue-200" };
    }
    return { text: "Final", color: "bg-amber-50 text-amber-600 border-amber-200" };
  };

  // If no school info is filled yet, show a prompt to complete registration
  if (!activeSchool) {
    return (
      <div className="bg-white border border-slate-100/90 shadow-md rounded-[24px] p-6 text-center mt-6">
        <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-bold text-slate-700">Ruang Sekolah Belum Aktif</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Silakan lengkapi profil biodata pendaftaran kompetisi Anda terlebih dahulu untuk membuka Forum Diskusi rekan satu sekolah.
        </p>
      </div>
    );
  }

  // Calculate statistics
  const totalSchoolmates = schoolmates.length;
  const passedMatesCount = schoolmates.filter(mate => {
    let stage = 1;
    let isFailed = false;
    if (mate.notes) {
      try {
        const n = JSON.parse(mate.notes);
        stage = n.current_stage || 1;
        isFailed = n.is_failed || false;
      } catch (e) {}
    }
    return stage >= 2 && !isFailed;
  }).length;

  return (
    <div className="mt-6 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden flex flex-col min-h-[460px]">
      
      {/* ─── HEADER: School Information & Stats ─── */}
      <div className="p-6 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-transparent border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative group/logo w-10 h-10 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-100/70 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm transition-all duration-300 hover:border-indigo-300">
            {isUploadingLogo ? (
              <Loader2 size={16} className="animate-spin text-indigo-600" />
            ) : schoolLogo ? (
              <img src={schoolLogo} alt="Logo Sekolah" className="w-full h-full object-cover" />
            ) : (
              <Building2 size={20} />
            )}
            
            {/* Elegant Hover Overlay to Upload custom logo */}
            <label htmlFor="school-logo-input" className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/logo:opacity-100 cursor-pointer transition-opacity duration-300">
              <Camera size={14} className="text-white" />
            </label>
            <input 
              type="file" 
              id="school-logo-input" 
              accept="image/*" 
              className="hidden" 
              onChange={handleLogoUpload} 
              disabled={isUploadingLogo}
            />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Ruang Sekolah</h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="font-semibold text-slate-500 text-xs tracking-wide">{activeSchool}</p>
              {activeNpsn && (
                <span className="bg-indigo-50 text-indigo-600 font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm shrink-0">
                  NPSN: {activeNpsn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* School Mini Stats Badges */}
        <div className="flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/60 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
            {totalSchoolmates} Terdaftar
          </span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">
            {passedMatesCount} Lolos T2/Final
          </span>
        </div>
      </div>

      {/* ─── TABS SELECTOR ─── */}
      <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === "chat"
              ? "text-indigo-600 border-indigo-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <MessageSquare size={14} />
          Diskusi Kelompok
        </button>
        <button
          onClick={() => setActiveTab("schoolmates")}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === "schoolmates"
              ? "text-indigo-600 border-indigo-600"
              : "text-slate-500 border-transparent hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          Rekan Sekolah ({totalSchoolmates})
        </button>
      </div>

      {/* ─── TAB CONTENT: LIVE CHAT ROOM ─── */}
      <div className="flex-1 flex flex-col p-4 min-h-[300px]">
        {activeTab === "chat" ? (
          <div className="flex-1 flex flex-col justify-between h-full min-h-[280px]">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto max-h-[280px] space-y-3.5 pr-1 mb-4 flex flex-col scroll-smooth">
              {isLoadingChats ? (
                <div className="flex-1 flex flex-col gap-3 py-4">
                  {/* Skeleton loading - chat bubbles */}
                  {[
                    { side: "left", w: "55%" },
                    { side: "right", w: "40%" },
                    { side: "left", w: "65%" },
                    { side: "right", w: "30%" },
                    { side: "left", w: "50%" },
                  ].map((s, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${s.side === "right" ? "items-end" : "items-start"}`}>
                      {s.side === "left" && (
                        <div className="h-2 w-16 bg-slate-100 rounded-full animate-pulse ml-1" style={{ animationDelay: `${i * 0.1}s` }} />
                      )}
                      <div
                        className={`h-8 rounded-2xl animate-pulse ${s.side === "right" ? "bg-indigo-100 rounded-tr-none" : "bg-slate-100 rounded-tl-none"}`}
                        style={{ width: s.w, animationDelay: `${i * 0.12}s` }}
                      />
                      <div className="h-1.5 w-8 bg-slate-100 rounded-full animate-pulse mx-1" style={{ animationDelay: `${i * 0.15}s` }} />
                    </div>
                  ))}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Memuat percakapan...</p>
                  </div>
                </div>
              ) : chatError === "TableNotCreated" ? (
                /* Graceful Setup Prompt for SQL migration */
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center my-4">
                  <ShieldAlert size={32} className="mx-auto text-amber-500 mb-2.5 animate-pulse" />
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Forum Chat Belum Aktif</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Tabel database `school_messages` belum dibuat oleh Admin. 
                  </p>
                  <div className="mt-3.5 text-[9px] bg-amber-50 text-amber-700 border border-amber-200/50 p-2 rounded-xl text-left font-mono">
                    Jalankan file migrasi:<br />
                    supabase/migrations/add_school_chat.sql
                  </div>
                </div>
              ) : chatError ? (
                <div className="text-center py-12 text-rose-500 text-xs font-bold">
                  {chatError}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <div className="relative mb-4">
                    <MessageSquare size={40} className="text-indigo-100" />
                    {/* Pulsing ring around icon */}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-indigo-50 animate-ping opacity-60" />
                    </span>
                    {/* Floating dots */}
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                  <h4 className="font-black text-slate-600 text-xs tracking-tight">Belum Ada Percakapan</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 max-w-[220px] leading-relaxed">
                    Jadilah yang pertama memulai diskusi sekolah Anda! 🚀
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-indigo-400 font-bold bg-indigo-50/70 px-3 py-1.5 rounded-full border border-indigo-100/60">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                    Ketik pesan di bawah untuk mulai
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const dateObj = new Date(msg.created_at);
                  const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col max-w-[80%] relative group/bubble ${isMe ? "self-end items-end" : "self-start items-start"}`}
                    >
                      {/* Sender Name */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                            {msg.sender_name}
                          </span>
                          {(() => {
                            const senderStudent = schoolmates.find(m => m.user_id === msg.sender_id);
                            if (senderStudent) {
                              const progress = getProgressDetails(senderStudent);
                              return (
                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 font-black text-[8.5px] px-1.5 py-0.2 rounded-md uppercase tracking-wider scale-90 inline-block">
                                  {senderStudent.competition_type || senderStudent.category || "Peserta"} • {progress.text}
                                </span>
                              );
                            } else if (msg.sender_id === "hq-admin" || msg.sender_id === "admin1") {
                              return (
                                <span className="bg-amber-100 text-amber-700 border border-amber-200/50 font-black text-[8px] px-1.5 py-0.2 rounded-md uppercase tracking-wider scale-90 inline-block shadow-sm">
                                  HQ STAFF
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                      {/* Hover Action Menu (WhatsApp style) */}
                      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white border border-slate-100 shadow-md rounded-full px-2 py-1 z-10 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 ${isMe ? "-left-24" : "-right-24"}`}>
                        {isMe && (
                          <>
                            <button 
                              onClick={() => { setEditingMsg(msg); setEditInput(msg.message.replace(/^↪ Diteruskan:\n/, "")); }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={11} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleForwardMessage(msg.message)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
                          title="Teruskan"
                        >
                          <Forward size={11} />
                        </button>
                      </div>

                      {/* Bubble Message */}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                          isMe
                            ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none shadow-indigo-100"
                            : "bg-slate-50 text-slate-700 border-slate-100 rounded-tl-none"
                        }`}
                      >
                        {msg.message.startsWith("↪ Diteruskan:\n") && (
                          <div className={`text-[9px] font-bold flex items-center gap-1 mb-1 pb-1 border-b ${isMe ? "text-indigo-200 border-indigo-500" : "text-slate-400 border-slate-200"}`}>
                            <Forward size={10} className="italic" />
                            Diteruskan
                          </div>
                        )}
                        {msg.message.replace(/^↪ Diteruskan:\n/, "")}
                      </div>
                      {/* Time Sent */}
                      <span className="text-[9px] text-slate-400 font-medium mt-1 mx-1.5">
                        {timeStr} WIB
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Form Input Message */}
            {chatError !== "TableNotCreated" && (
              <form onSubmit={handleSendMessage} className="relative flex gap-2 items-center">
                <input
                  type="text"
                  required
                  placeholder="Ketik pesan diskusi sekolah..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending || chatError !== null}
                  className="flex-1 pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-inner disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </form>
            )}

          </div>
        ) : (
          /* ─── TAB CONTENT: SCHOOLMATE DIRECTORY ─── */
          <div className="flex-1 flex flex-col justify-start min-h-[280px]">
            {isLoadingMates ? (
              <div className="flex-1 flex flex-col gap-2.5 py-2">
                {/* Skeleton cards for schoolmates */}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl animate-pulse bg-white"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar skeleton */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-2.5 bg-slate-100 rounded-full" style={{ width: `${80 + i * 20}px` }} />
                        <div className="h-2 bg-slate-50 rounded-full w-16" />
                      </div>
                    </div>
                    <div className="h-5 w-14 bg-slate-100 rounded-md" />
                  </div>
                ))}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Memuat data rekan sekolah...
                  </p>
                </div>
              </div>
            ) : schoolmates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="relative mb-4">
                  <Users size={44} className="text-indigo-100" />
                  {/* Pulsing ring */}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-indigo-50 animate-ping opacity-50" />
                  </span>
                  {/* Floating stars */}
                  {["✨", "⭐", "🌟"].map((star, i) => (
                    <span
                      key={i}
                      className="absolute text-[10px] animate-bounce"
                      style={{
                        top: i === 0 ? "-8px" : i === 1 ? "50%" : "auto",
                        bottom: i === 2 ? "-8px" : "auto",
                        left: i === 1 ? "-16px" : "auto",
                        right: i === 0 ? "-12px" : i === 2 ? "-10px" : "auto",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    >
                      {star}
                    </span>
                  ))}
                </div>
                <h4 className="font-black text-slate-700 text-xs tracking-tight">Pionir Pertama Sekolah Anda! 🎉</h4>
                <p className="text-[11px] text-slate-400 mt-2 max-w-[240px] mx-auto leading-relaxed">
                  Anda adalah peserta pertama dari sekolah ini. Ajak teman lainnya untuk mendaftar!
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/60 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Jadilah pelopor dari sekolahmu
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {schoolmates.map((mate) => {
                  const progress = getProgressDetails(mate);
                  const isMe = mate.email === currentUser?.email;

                  let matePhoto = null;
                  if (mate.notes) {
                    try {
                      const parsed = JSON.parse(mate.notes);
                      matePhoto = parsed.profile_photo_url;
                    } catch (e) {}
                  }

                  return (
                    <div
                      key={mate.id}
                      className={`flex items-center justify-between p-3.5 border rounded-xl hover:shadow-sm transition-all ${
                        isMe
                          ? "bg-indigo-50/30 border-indigo-100"
                          : "bg-white border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {matePhoto ? (
                          <img 
                            src={matePhoto} 
                            alt={mate.full_name} 
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200/80 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 border ${
                            isMe
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                              : "bg-slate-50 text-slate-600 border-slate-100"
                          }`}>
                            {mate.full_name?.charAt(0).toUpperCase() || "P"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 text-xs">
                              {mate.full_name || "Peserta NCC"}
                            </span>
                            {isMe && (
                              <span className="bg-indigo-100 text-indigo-700 font-black text-[8px] uppercase px-1 rounded">Saya</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">
                            {mate.competition_type || mate.category || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black border flex items-center gap-1 uppercase tracking-wide shrink-0 shadow-sm ${progress.color}`}>
                        {progress.text === "Final" ? <Award size={10} /> : <CheckCircle2 size={10} />}
                        {progress.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✏️ EDIT MESSAGE MODAL */}
      {editingMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Edit Pesan</h3>
            <form onSubmit={handleUpdateMessage} className="space-y-4">
              <textarea
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-inner resize-none h-24"
                placeholder="Edit pesan Anda..."
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setEditingMsg(null); setEditInput(""); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
