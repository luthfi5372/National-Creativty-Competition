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
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-2 py-2 transition-all duration-300 rounded-full border ${
          scrolled 
            ? "bg-white/90 backdrop-blur-md shadow-sm border-slate-200" 
            : "bg-white/50 backdrop-blur-sm border-transparent"
        }`}
      >
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {/* Brand */}
          <MagneticWrapper>
            <div className="px-4 py-2 mr-2 flex items-center gap-2.5 cursor-pointer transition-transform">
                <div className="relative h-9 flex items-center justify-center shrink-0">
                  <img 
                    src="/logo-ncc.png" 
                    alt="Logo NCC 13th" 
                    className="h-8 sm:h-9 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105" 
                  />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span
                    className="font-black text-sm tracking-wide text-slate-900"
                    style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
                  >
                    NCC
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 tracking-wider">
                    13th
                  </span>
                </div>
            </div>
          </MagneticWrapper>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeItem === item.label;
            return (
              <MagneticWrapper key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setActiveItem(item.label)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all duration-300 group ${
                    active
                      ? "text-indigo-600"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`transition-all duration-300 ${
                      active ? "text-indigo-600" : "group-hover:text-indigo-500"
                    }`}
                  />
                  <span className="font-medium relative z-10">{item.label}</span>

                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-indigo-50 border border-indigo-100"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </MagneticWrapper>
            );
          })}

          {/* Auth buttons */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-100">
            {authLoading ? (
              // Skeleton saat auth belum selesai dicek
              <div className="w-28 h-9 rounded-full bg-slate-100 animate-pulse" />
            ) : user ? (
               <MagneticWrapper>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-black text-white bg-indigo-600 hover:bg-slate-900 transition-all shadow-sm shadow-indigo-100"
                >
                  <ClipboardList size={15} /> Dashboard
                </Link>
              </MagneticWrapper>
            ) : (
              <>
                <MagneticWrapper>
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <LogIn size={15} /> Masuk
                  </Link>
                </MagneticWrapper>
                <MagneticWrapper>
                  <Link
                    href="/daftar"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                  >
                    <ClipboardList size={15} /> Daftar
                  </Link>
                </MagneticWrapper>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav toggle */}
        <div className="flex md:hidden items-center justify-between px-3 py-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <img 
              src="/logo-ncc.png" 
              alt="Logo NCC 13th" 
              className="h-7 w-auto object-contain" 
            />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-black text-xs text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
                NCC
              </span>
              <span className="text-[9px] font-black text-indigo-600 tracking-wider">
                13th
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
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
            className="fixed top-20 left-4 right-4 z-40 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col gap-1 md:hidden"
          >
            {navItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    setActiveItem(item.label);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
