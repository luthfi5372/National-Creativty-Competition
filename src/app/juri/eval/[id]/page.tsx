"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ExternalLink, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Video, 
  MessageSquare,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchHybridEntries, submitJuryScore, fetchEntryScores } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/client";

const CRITERIA_MAP: Record<string, any[]> = {
  "Speech Contest": [
    { key: "clarity", label: "Clarity & Pronunciation", max: 25 },
    { key: "content", label: "Content & Depth", max: 25 },
    { key: "performance", label: "Stage Performance", max: 25 },
    { key: "grammar", label: "Grammar & Vocab", max: 25 },
  ],
  "LKTI Nasional": [
    { key: "originality", label: "Orisinalitas Ide", max: 30 },
    { key: "methodology", label: "Metodologi Ilmiah", max: 30 },
    { key: "practicality", label: "Kemungkinan Implementasi", max: 20 },
    { key: "structure", label: "Struktur Penulisan", max: 20 },
  ],
  "Olimpiade MIPA": [
    { key: "logic", label: "Logika Penyelesaian", max: 40 },
    { key: "accuracy", label: "Ketepatan Jawaban", max: 40 },
    { key: "speed", label: "Kecepatan/Efisiensi", max: 20 },
  ],
  "MTQ Nasional": [
    { key: "tajwid", label: "Hukum Tajwid", max: 40 },
    { key: "irama", label: "Irama & Lagu", max: 30 },
    { key: "suara", label: "Kualitas Suara", max: 30 },
  ],
  "Default": [
    { key: "general", label: "Kualitas Global", max: 100 },
  ]
};

export default function JuryEvaluator() {
  const { id } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [entry, setEntry] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const JURI_EMAILS = [
    "luthfi5372@gmail.com",
    "admin@ncc.id",
    "admin1@ncc.id",
    "halo.ncc@gmail.com",
    "juri@ncc.id",
    "evaluator@ncc.id"
  ];

  async function loadData() {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    // 🛡️ SECURITY GUARD: Only authorized judges!
    if (!supabaseUser || authError) {
      router.replace('/login');
      return;
    }

    if (!JURI_EMAILS.includes(supabaseUser.email || "")) {
      alert("⛔ AKSES DITOLAK! Anda bukan Juri resmi NCC.");
      router.replace('/dashboard');
      return;
    }

    setUser(supabaseUser);

    // Fetch Entry Details
    const { data: entries } = await createClient().from('competition_entries').select('*').eq('id', id).single();
    
    if (entries) {
      setEntry(entries);
      const catCriteria = CRITERIA_MAP[entries.category] || CRITERIA_MAP["Default"];
      setCriteria(catCriteria);
      
      // Initialize scores
      const initialScores: Record<string, number> = {};
      catCriteria.forEach(c => initialScores[c.key] = 0);
      setScores(initialScores);
 
      // Fetch existing score by this judge
      const { data: existingScores } = await fetchEntryScores(id as string);
      const myPrevScore = existingScores?.find(s => s.juri_email === supabaseUser?.email);
      
      if (myPrevScore) {
        setScores(myPrevScore.criteria_scores || initialScores);
        setComments(myPrevScore.comments || "");
      }
    }
    setIsLoading(false);
  }

  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((a, b) => a + b, 0);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    const res = await submitJuryScore({
      entryId: id as string,
      juriEmail: user.email,
      totalScore: calculateTotal(),
      criteriaScores: scores,
      comments: comments
    });

    if (res.success) {
      alert("Penilaian berhasil disimpan!");
      router.push("/juri");
    } else {
      alert("Gagal menyimpan penilaian: " + res.error);
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-indigo-400 font-black animate-pulse">LOADING NCC EVALUATOR...</div>

  return (
    <div className="h-screen bg-[#020617] overflow-hidden flex flex-col">
      {/* Header Bar */}
      <header className="h-16 border-b border-white/5 bg-slate-950 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/juri" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-white/60" />
          </Link>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <h1 className="text-sm font-black tracking-tight uppercase">
            Evaluating: <span className="text-indigo-400">{entry?.full_name}</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
             Total: {calculateTotal()} / 100
           </div>
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
           >
             {isSubmitting ? "Saving..." : "Submit Grades"}
           </button>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Submission Preview */}
        <div className="w-3/5 border-r border-white/5 bg-black/20 relative flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                <FileText size={14} /> Submission Work
             </div>
             {entry?.submission_url && (
               <a 
                 href={entry.submission_url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center gap-2 text-[10px] font-black text-indigo-400 hover:text-white transition-colors uppercase tracking-widest"
               >
                 Open Full Work <ExternalLink size={12} />
               </a>
             )}
          </div>
          
          <div className="flex-1 p-8 overflow-auto">
             {entry?.submission_url ? (
               <div className="h-full w-full rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center p-12">
                  <div className="w-20 h-20 rounded-full bg-indigo-600/10 flex items-center justify-center mb-6">
                     <Video className="text-indigo-500" size={32} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Participant Submission Work</h3>
                  <p className="text-white/40 text-sm max-w-md mb-8">
                     Karya/Video peserta tersedia di URL eksternal. Silakan buka tautan di bawah ini untuk meninjau secara mendalam.
                  </p>
                  <a 
                    href={entry.submission_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center gap-3"
                  >
                    Launch Submission Viewer <ExternalLink size={16} />
                  </a>
               </div>
             ) : (
               <div className="h-full w-full rounded-3xl border border-white/10 border-dashed flex flex-col items-center justify-center text-center text-white/20">
                  <AlertCircle size={48} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">No Submission URL Provided Yet</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Evaluation Form */}
        <div className="w-2/5 flex flex-col bg-slate-950/30">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
             <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                <BarChart3 size={14} /> Scoring Criteria
             </div>
          </div>

          <div className="flex-1 overflow-auto p-10 space-y-10">
            {criteria.map((c) => (
              <div key={c.key} className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[.25em] mb-1">{c.label}</h4>
                    <span className="text-xl font-black text-white">{scores[c.key]}</span>
                    <span className="text-white/20 font-bold"> / {c.max}</span>
                  </div>
                </div>
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden group">
                  <input 
                    type="range"
                    min="0"
                    max={c.max}
                    value={scores[c.key]}
                    onChange={(e) => handleScoreChange(c.key, parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <motion.div 
                    initial={false}
                    animate={{ width: `${(scores[c.key]/c.max) * 100}%` }}
                    className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                  />
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-white/5 space-y-4">
               <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                  <MessageSquare size={14} /> Judge's Feedback
               </div>
               <textarea 
                 value={comments}
                 onChange={(e) => setComments(e.target.value)}
                 placeholder="Berikan masukan konstruktif untuk peserta..."
                 className="w-full h-40 bg-white/[0.02] border border-white/10 focus:border-indigo-500/50 rounded-2xl p-6 text-sm outline-none transition-all resize-none font-medium placeholder:text-white/10"
               />
            </div>
          </div>

          <div className="p-8 border-t border-white/5 bg-black/40">
             <div className="flex items-center gap-4 text-white/40">
                <ShieldCheck size={20} className="text-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Assessment secured by NCC Autonomous Governance
                </p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
      </div>
    </div>
  );
}

function ShieldCheck({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
