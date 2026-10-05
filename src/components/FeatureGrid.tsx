"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Trophy, 
  Banknote, 
  ScrollText, 
  GraduationCap, 
  Medal, 
  Award, 
  Users,
  BookOpen,
  Heart,
  Zap,
  Sparkles,
  Smartphone,
  Globe
} from "lucide-react";
import { fetchHomepageDescriptions } from "@/lib/supabase/service";

// Icon mapper from string storage to Lucide icons
const iconMap: Record<string, any> = {
  Trophy,
  Banknote,
  ScrollText,
  GraduationCap,
  Medal,
  Award,
  Users,
  CheckCircle2,
  BookOpen,
  Heart,
  Zap,
  Sparkles,
  Smartphone,
  Globe
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function FeatureGrid() {
  // Default fallback items for "What is NCC?" about bullet points
  const [abouts, setAbouts] = useState<any[]>([
    { id: 1, title: "Tingkat Nasional Sejak 1 Dekade" },
    { id: 2, title: "Mengasah Potensi Multidisiplin" },
    { id: 3, title: "Piala Bergilir Bergengsi" }
  ]);

  // Default fallback items for "Benefits" cards
  const [benefits, setBenefits] = useState<any[]>([
    { id: 4, title: "Trophies Of Award", icon: "Trophy", color: "text-amber-500", bg: "bg-amber-50", borderColor: "hover:border-amber-200" },
    { id: 5, title: "Counseling Money", icon: "Banknote", color: "text-emerald-500", bg: "bg-emerald-50", borderColor: "hover:border-emerald-200" },
    { id: 6, title: "Certificate Of Award", icon: "ScrollText", color: "text-indigo-500", bg: "bg-indigo-50", borderColor: "hover:border-indigo-200" },
    { id: 7, title: "Get 25% Scholarship Senior High School", icon: "GraduationCap", color: "text-blue-500", bg: "bg-blue-50", borderColor: "hover:border-blue-200" },
  ]);

  useEffect(() => {
    const loadDescriptions = async () => {
      try {
        const { data, error } = await fetchHomepageDescriptions();
        if (!error && data && data.length > 0) {
          const dbAbouts = data.filter((d: any) => d.category === 'about');
          const dbBenefits = data.filter((d: any) => d.category === 'benefit');
          
          if (dbAbouts.length > 0) {
            const uniqueAbouts = dbAbouts.filter((item, index, self) =>
              self.findIndex(t => (t.title || t.content) === (item.title || item.content)) === index
            );
            setAbouts(uniqueAbouts);
          }
          if (dbBenefits.length > 0) {
            const colorSchemes: Record<string, any> = {
              Trophy: { color: "text-amber-500", bg: "bg-amber-50", borderColor: "hover:border-amber-200" },
              Banknote: { color: "text-emerald-500", bg: "bg-emerald-50", borderColor: "hover:border-emerald-200" },
              ScrollText: { color: "text-indigo-500", bg: "bg-indigo-50", borderColor: "hover:border-indigo-200" },
              GraduationCap: { color: "text-blue-500", bg: "bg-blue-50", borderColor: "hover:border-blue-200" },
              Medal: { color: "text-rose-500", bg: "bg-rose-50", borderColor: "hover:border-rose-200" },
              Award: { color: "text-violet-500", bg: "bg-violet-50", borderColor: "hover:border-violet-200" },
              Users: { color: "text-teal-500", bg: "bg-teal-50", borderColor: "hover:border-teal-200" },
              Smartphone: { color: "text-cyan-500", bg: "bg-cyan-50", borderColor: "hover:border-cyan-200" },
              Globe: { color: "text-pink-500", bg: "bg-pink-50", borderColor: "hover:border-pink-200" },
              default: { color: "text-indigo-500", bg: "bg-indigo-50", borderColor: "hover:border-indigo-200" }
            };

            const mapped = dbBenefits.map((b: any) => {
              const scheme = colorSchemes[b.icon] || colorSchemes.default;
              return {
                ...b,
                ...scheme
              };
            });
            setBenefits(mapped);
          }
        }
      } catch (err) {
        console.error("FeatureGrid database pull fallback active:", err);
      }
    };
    loadDescriptions();
  }, []);

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col gap-12 sm:gap-20">
      
      {/* 1. Split Layout: Text Right, Image Left */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto"
      >
        {/* LEFT COLUMN: Competition Imagery */}
        <div className="order-2 md:order-1 relative aspect-[4/3] flex items-center justify-center mt-10 md:mt-0">
          
          <div className="relative w-full max-w-sm scale-[0.88] sm:scale-100 origin-center">
            {/* Base Certificate Mockup */}
            <motion.div 
               initial={{ rotate: -5, y: 20, opacity: 0 }}
               whileInView={{ rotate: -5, y: 0, opacity: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6 }}
               className="w-full aspect-[4/3] bg-white border border-slate-200 shadow-xl rounded-2xl p-6 flex flex-col justify-between absolute top-0 -left-4 sm:-left-6 z-10"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100"><Award className="text-slate-400" /></div>
                <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center"><Trophy size={18} className="text-amber-500" /></div>
              </div>
              <div className="space-y-4">
                <div className="w-5/6 h-4 bg-slate-200 rounded-md" />
                <div className="w-1/2 h-3 bg-slate-100 rounded-md" />
              </div>
            </motion.div>

            {/* Top Primary Card */}
            <motion.div 
               initial={{ rotate: 3, y: 30, opacity: 0 }}
               whileInView={{ rotate: 3, y: 0, opacity: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="w-full aspect-[4/3] bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400 shadow-2xl shadow-indigo-600/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative z-20"
            >
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center mb-6 p-2.5 shadow-2xl shadow-indigo-900/40">
                <img 
                  src="/logo-ncc.png" 
                  alt="Logo NCC 13th" 
                  className="w-full h-full object-contain drop-shadow-lg" 
                />
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Piala Bergilir</h4>
              <p className="text-indigo-100 font-medium text-sm sm:text-base">Kementerian Agama RI & Gubernur Jatim</p>
            </motion.div>

            {/* Floating Stats Element */}
             <motion.div 
               animate={{ y: [-10, 10, -10] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -right-4 sm:-right-6 lg:-right-12 -bottom-6 sm:-bottom-8 z-30 bg-white px-5 sm:px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 sm:gap-4 border border-slate-100"
             >
               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-full flex shrink-0 items-center justify-center">
                 <Users size={20} className="text-emerald-600" />
               </div>
               <div>
                  <div className="text-sm sm:text-base font-bold text-slate-800">1000+ Peserta</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">Dari Seluruh Indonesia</div>
               </div>
             </motion.div>
          </div>

        </div>

        {/* RIGHT COLUMN: What is NCC Text */}
        <motion.div variants={itemVariants} className="order-1 md:order-2 flex flex-col items-start text-left z-20">
          <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase mb-3">NCC</h2>
          <h3 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6 uppercase" style={{ fontFamily: "var(--font-display)" }}>
            What is NCC?
          </h3>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            National creativity competition atau biasa disebut dengan NCC adalah event lomba tingkat Nasional untuk siswa/i SMP/MTs sederajat di seluruh Indonesia yang diselenggarakan oleh SMA Darul Ulum 1 Unggulan Peterongan Jombang. Guna meningkatkan kecerdasan dan kreatifitas anak bangsa dalam bidang Penelitian, Agama, Akademik dan Bahasa.
          </p>
          <ul className="flex flex-col gap-4">
            {abouts.map((item) => (
              <li key={item.id} className="flex items-start sm:items-center gap-3 text-slate-700 font-medium">
                <CheckCircle2 className="text-indigo-600 shrink-0 mt-1 sm:mt-0" size={20} />
                <span className="leading-snug">{item.title || item.content}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* 2. Grid Cards Layout (Benefits) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="flex flex-col items-center text-center w-full max-w-5xl mx-auto"
      >
        <span className="px-5 py-1.5 rounded-full bg-slate-100 text-sm font-bold text-slate-500 tracking-widest uppercase mb-6 inline-block shadow-sm">Benefits</span>
        <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-16 uppercase text-center" style={{ fontFamily: "var(--font-display)" }}>
          Benefits Of Participating NCC
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full text-left cursor-default">
          {benefits.map((feat) => {
            const IconComponent = iconMap[feat.icon] || Trophy;
            return (
              <motion.div key={feat.id} variants={itemVariants} className={`glass-panel p-4 sm:p-8 rounded-3xl flex items-center gap-4 sm:gap-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all bg-white group border border-slate-100 ${feat.borderColor}`}>
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${feat.bg} flex items-center justify-center shrink-0 ${feat.color} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                  <IconComponent size={24} className="sm:hidden" strokeWidth={1.5} />
                  <IconComponent size={32} className="hidden sm:block" strokeWidth={1.5} />
                </div>
                 <div className="flex flex-col gap-1 pr-4">
                   <h4 className="text-base sm:text-xl font-bold text-slate-700 leading-snug">{feat.title}</h4>
                   {feat.content && <p className="text-xs text-slate-400 font-medium leading-relaxed">{feat.content}</p>}
                 </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

    </section>
  );
}
