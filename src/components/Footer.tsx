"use client";

import { useState, useEffect } from "react";
import { Mail, MapPin, Phone, Hash, Link as LinkIcon, AtSign, MessageCircle } from "lucide-react";
import { fetchSiteSettings } from "@/lib/supabase/service";

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await fetchSiteSettings();
      if (data) setSettings(data);
    }
    loadSettings();
  }, []);

  return (
    <footer id="kontak" className="relative z-10 mt-12 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white">
                {settings?.site_brand_name?.[0] || "N"}
              </div>
              <div>
                <h3
                  className="font-bold text-lg text-slate-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {settings?.site_brand_name || "NCC 2026"}
                </h3>
                <p className="text-xs text-slate-500">
                  {settings?.site_title || "National Creativity Competition"}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Kompetisi kreativitas nasional yang menghadirkan panggung bagi
              generasi muda Indonesia untuk berinovasi dan berprestasi.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4
              className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tautan
            </h4>
            <div className="space-y-3">
              {[
                { label: "Beranda", href: "#beranda" },
                { label: "Kategori", href: "#kategori" },
                { label: "Jadwal", href: "#jadwal" },
                { label: "Pendaftaran", href: "#daftar" },
                { label: "FAQ", href: "#" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-slate-500 hover:text-indigo-600 transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Kontak
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Mail size={14} className="text-indigo-500" />
                <span>{settings?.contact_email || "info@ncc2026.id"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone size={14} className="text-indigo-500" />
                <span>{settings?.contact_phone || "(0321) 860129"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <MapPin size={14} className="text-indigo-500" />
                <span className="whitespace-pre-line">
                  {settings?.contact_address || "Jl. KH. Romli Tamim No.15a, Peterongan,\nJombang, Jawa Timur 61481"}
                </span>
              </div>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: Hash, href: "#" },
                { icon: LinkIcon, href: "#" },
                { icon: AtSign, href: "#" },
              ].map((social, i) => {
                const Icon = social.icon;
                return (
                  <a
                    key={i}
                    href={social.href}
                    className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-all duration-300 hover:scale-110"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contact Person WhatsApp Buttons */}
        <div className="mt-10 pt-8 border-t border-slate-100">
          <h4
            className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Contact Person (CP)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { category: "LKTI", name: "Rizki Yudha Sentika, M.Pd", phone: "6285746460644" },
              { category: "Olimpiade MIPA", name: "Yudha Kristiawan, M.Pd", phone: "6281331374833" },
              { category: "Olimpiade MIPA", name: "Putri Setyaningati N, S.Pd", phone: "6285730034516" },
              { category: "Speech Contest", name: "Rizkia Putri Perdana, S.Pd", phone: "6285649603868" },
              { category: "MTQ", name: "Herina Jum'atin A, S.Pd.I. M.Pd", phone: "6281233882731" },
            ].map((cp, i) => (
              <a
                key={i}
                href={`https://wa.me/${cp.phone}?text=${encodeURIComponent(`Assalamualaikum, saya ingin bertanya mengenai lomba ${cp.category} NCC 13th.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 rounded-xl transition-all group"
              >
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{cp.category}</p>
                  <p className="text-xs text-slate-600 font-medium truncate">{cp.name}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © 2026 National Creativity Competition. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Dibangun dengan{" "}
            <span className="text-slate-600 font-medium">Next.js</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
