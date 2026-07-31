"use client";

import { motion } from "framer-motion";
import { Mic, BookOpen, Sun, Atom, ArrowRight, FileText } from "lucide-react";

const categories = [
  {
    id: "speech",
    title: "SPEECH CONTEST",
    icon: Mic,
    description:
      "Tunjukkan kemampuan berbicara di depan publik. Sampaikan gagasan inovatif dengan penuh percaya diri dan retorika yang memukau.",
    color: "text-red-500",
    bg: "bg-red-50",
    juknis: "/juknis/juknis-speech.pdf",
  },
  {
    id: "lkti",
    title: "LKTI",
    icon: BookOpen,
    description:
      "Lomba Karya Tulis Ilmiah — wadah bagi peneliti muda untuk mempresentasikan temuan inovatif dan solusi berbasis rigor akademik.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    juknis: "/juknis/juknis-lkti.pdf",
  },
  {
    id: "mtq",
    title: "MTQ",
    icon: Sun,
    description:
      "Musabaqah Tilawatil Quran — kompetisi seni baca Al-Quran, menampilkan keindahan tajwid dan kedalaman spiritual.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    juknis: "/juknis/juknis-mtq.pdf",
  },
  {
    id: "mipa",
    title: "OLIMPIADE MIPA",
    icon: Atom,
    description:
      "Tantangan akademik tingkat tinggi di bidang Matematika dan Ilmu Pengetahuan Alam. Uji kemampuan analitis dan problem-solving.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    juknis: "/juknis/juknis-olimpiade-mipa.pdf",
  },
];

export default function CategoryCards() {
  return (
    <section id="kategori" className="relative z-10 py-24 px-6 sm:px-10 bg-transparent">
      {/* Section header */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-slate-900" style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}>
          Kategori Kompetisi
        </h2>
        <p className="text-slate-600 text-lg">
          Empat cabang lomba yang dirancang untuk menguji berbagai dimensi kreativitas dan keunggulan akademik.
        </p>
      </div>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                delay: i * 0.1, 
                duration: 0.6, 
                type: "spring", 
                stiffness: 100, 
                damping: 20 
              }}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col items-start text-left cursor-pointer"
            >
              {/* Icon container */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${cat.bg}`}>
                <Icon size={26} className={cat.color} />
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold mb-3 tracking-wide text-slate-900" style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}>
                {cat.title}
              </h3>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                {cat.description}
              </p>

              {/* Action links */}
              <div className="flex items-center gap-4 w-full flex-wrap">
                <a
                  href={cat.juknis}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 hover:border-slate-300"
                >
                  <FileText size={14} />
                  <span>Lihat Juknis</span>
                </a>
                <div className={`inline-flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-3 ${cat.color}`}>
                  <span>Selengkapnya</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
