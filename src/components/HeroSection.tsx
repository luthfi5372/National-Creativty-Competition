"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Trophy, BookOpen, Mic, Microscope, GraduationCap } from "lucide-react";
import Link from "next/link";
import TextAnimate from "./ui/TextAnimate";
import LineDrawIcon from "./ui/LineDrawIcon";



import MagneticWrapper from "./ui/MagneticWrapper";

// Remove unused imports introduced previously
export default function HeroSection() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Audit: Sync with Supabase Session safely from browser
    const checkAuth = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser) {
          setUser({
            email: supabaseUser.email,
            fullName: supabaseUser.user_metadata.full_name || supabaseUser.user_metadata.fullName || "Peserta NCC",
            username: supabaseUser.user_metadata.username || supabaseUser.email?.split('@')[0]
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <section
      id="beranda"
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 bg-transparent"
    >
      {/* Grid Layout fitting Competition Landing Page aesthetics */}
      <div className="grid md:grid-cols-2 gap-12 font-sans items-center w-full max-w-7xl mx-auto z-10 relative">
        
        {/* LEFT COLUMN: Typography & CTAs */}
        <motion.div className="text-left w-full z-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 mb-8 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
          >
            <Sparkles size={14} className="text-blue-600" />
            <span className="text-xs sm:text-sm font-medium tracking-wide">
              Kompetisi Kreativitas & Edukasi Nasional
            </span>
          </motion.div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-slate-900"
            style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
          >
            <span className="block animate-fade-in-up [animation-delay:100ms] opacity-0">Tumbuhkan</span>
            <span className="block text-indigo-600 animate-fade-in-up [animation-delay:300ms] opacity-0">Inovasi Nyata</span>
            <span className="block animate-fade-in-up [animation-delay:500ms] opacity-0">Di Sini.</span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0 }}
            className="text-base sm:text-lg text-slate-600 max-w-lg mb-10 leading-relaxed"
          >
            Arsitektur yang dirancang untuk membantu anak bangsa menyalurkan
            <span className="font-semibold text-slate-900"> bakat</span>, mempresentasikan{" "}
            <span className="font-semibold text-slate-900">riset</span>, dan meraih relasi ke puncak tertinggi Indonesia.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.2 }}
            className="flex flex-col sm:flex-row items-center justify-start gap-4"
          >
            {/* Primary CTA */}
            <MagneticWrapper>
              <Link
                href={authLoading ? '#' : (user ? "/dashboard" : "/daftar")}
                className={`group flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 ${
                  authLoading ? 'opacity-70 pointer-events-none' : ''
                }`}
              >
                {authLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    {user ? "Buka Dashboard" : "Daftar Tim Sekarang"}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Link>
            </MagneticWrapper>

            {/* Secondary CTA */}
            <MagneticWrapper>
              <Link
                href="/leaderboard"
                className="group px-8 py-4 rounded-xl font-semibold text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm flex items-center gap-2"
              >
                <Trophy size={16} className="text-amber-500 group-hover:scale-125 transition-transform" />
                Live Ranking
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </Link>
            </MagneticWrapper>

            {/* Third CTA */}
            <MagneticWrapper>
              <a
                href="#kategori"
                className="px-8 py-4 rounded-xl font-semibold text-sm text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Kategori Lomba
              </a>
            </MagneticWrapper>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN: Large Combined Waving Mascots (Nicci & Nicco) */}
        <div className="relative w-full flex items-center justify-center min-h-[350px] md:min-h-[500px]">
          <motion.div 
            animate={{ 
              y: [-12, 12, -12],
              rotate: [-1.5, 1.5, -1.5]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full max-w-[520px] md:max-w-[600px] lg:max-w-[650px] aspect-[2550/1702] relative pointer-events-none"
          >
            <img 
              src="/mascots.svg" 
              alt="Nicci & Nicco Mascots" 
              width="650"
              height="434"
              loading="eager"
              // @ts-ignore
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_-12px_rgba(99,102,241,0.18)]" 
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
