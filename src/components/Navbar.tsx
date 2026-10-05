"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Layers,
  Calendar,
  UserPlus,
  Mail,
  Menu,
  X,
  LogIn,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

import MagneticWrapper from "./ui/MagneticWrapper";

const navItems = [
  { icon: Home, label: "Beranda", href: "/#beranda" },
  { icon: Layers, label: "Kategori", href: "/#kategori" },
  { icon: ClipboardList, label: "Leaderboard", href: "/leaderboard" },
  { icon: Calendar, label: "Jadwal", href: "/#jadwal" },
  { icon: UserPlus, label: "Pendaftaran", href: "/daftar" },
  { icon: Mail, label: "Kontak", href: "/#kontak" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Beranda");
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Audit-Check: Use Browser Client for safe session detection
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

        // Fetch Branding
        const { fetchSiteSettings } = await import("@/lib/supabase/service");
        const { data } = await fetchSiteSettings();
        if (data) setSettings(data);

      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 px-1.5 sm:px-2 py-1.5 sm:py-2 transition-all duration-300 rounded-full border max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] ${
          scrolled 
            ? "bg-white/90 backdrop-blur-md shadow-sm border-slate-200" 
            : "bg-white/50 backdrop-blur-sm border-transparent"
        }`}
      >
        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {/* Brand */}
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 mr-1 xl:mr-2 rounded-full hover:bg-slate-100/60 transition-all cursor-pointer select-none group"
          >
            <div className="relative h-8 xl:h-9 flex items-center justify-center shrink-0">
              <img 
                src="/logo-ncc.png" 
                alt="Logo NCC 13th" 
                className="h-7 lg:h-8 xl:h-9 w-auto object-contain drop-shadow-sm transition-transform group-hover:scale-105" 
              />
            </div>
            <div className="flex flex-col text-left leading-tight shrink-0">
              <span
                className="font-black text-xs xl:text-sm tracking-wide text-slate-900"
                style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
              >
                NCC
              </span>
              <span className="text-[9px] xl:text-[10px] font-black text-indigo-600 tracking-wider">
                13th
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-0.5 xl:gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeItem === item.label;
              return (
                <MagneticWrapper key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setActiveItem(item.label)}
                    className={`relative shrink-0 whitespace-nowrap flex items-center gap-1.5 xl:gap-2 px-2.5 lg:px-3 xl:px-4 py-1.5 xl:py-2.5 rounded-full text-xs xl:text-sm font-medium transition-all duration-200 group ${
                      active
                        ? "text-indigo-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 transition-all duration-200 xl:w-4 xl:h-4 ${
                        active ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>

                    {/* Active indicator */}
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-indigo-50 border border-indigo-100 -z-0"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                </MagneticWrapper>
              );
            })}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-1.5 xl:gap-2 ml-1 xl:ml-2 pl-2 border-l border-slate-200/80 shrink-0">
            {authLoading ? (
              // Skeleton saat auth belum selesai dicek
              <div className="w-20 xl:w-28 h-8 xl:h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
            ) : user ? (
              <MagneticWrapper>
                <Link
                  href="/dashboard"
                  className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-4 xl:px-6 py-1.5 xl:py-2.5 rounded-full text-xs xl:text-sm font-black text-white bg-indigo-600 hover:bg-slate-900 transition-all shadow-sm shadow-indigo-100"
                >
                  <ClipboardList size={14} className="xl:w-4 xl:h-4" /> Dashboard
                </Link>
              </MagneticWrapper>
            ) : (
              <>
                <MagneticWrapper>
                  <Link
                    href="/login"
                    className="shrink-0 whitespace-nowrap flex items-center gap-1 xl:gap-1.5 px-2.5 xl:px-4 py-1.5 xl:py-2.5 rounded-full text-xs xl:text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <LogIn size={14} className="xl:w-4 xl:h-4" /> Masuk
                  </Link>
                </MagneticWrapper>
                <MagneticWrapper>
                  <Link
                    href="/daftar"
                    className="shrink-0 whitespace-nowrap flex items-center gap-1 xl:gap-1.5 px-3.5 xl:px-5 py-1.5 xl:py-2.5 rounded-full text-xs xl:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                  >
                    <ClipboardList size={14} className="xl:w-4 xl:h-4" /> Daftar
                  </Link>
                </MagneticWrapper>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav toggle */}
        <div className="flex lg:hidden items-center justify-between px-2.5 sm:px-3 py-1 min-w-[240px] sm:min-w-[280px]">
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src="/logo-ncc.png" 
              alt="Logo NCC 13th" 
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-black text-xs text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                NCC
              </span>
              <span className="text-[9px] font-black text-indigo-600 tracking-wider">
                13th
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 sm:top-20 left-4 right-4 z-40 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 flex flex-col gap-1 lg:hidden max-h-[calc(100vh-5.5rem)] overflow-y-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    setActiveItem(item.label);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                    activeItem === item.label
                      ? "text-indigo-600 bg-indigo-50 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile Auth Actions */}
            <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2">
              {authLoading ? (
                <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
              ) : user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <ClipboardList size={16} /> Dashboard ({user.fullName?.split(' ')[0] || "Peserta"})
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    <LogIn size={15} /> Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <ClipboardList size={15} /> Daftar
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
