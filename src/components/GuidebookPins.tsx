"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const guidebooks = [
  {
    id: "mtq",
    title: "MTQ",
    subtitle: "Musabaqah Tilawatil Quran",
    image: "/guidebook-mtq.png",
    juknis: "/juknis/juknis-mtq.pdf",
  },
  {
    id: "lkti",
    title: "LKTI",
    subtitle: "Lomba Karya Tulis Ilmiah",
    image: "/guidebook-lkti.png",
    juknis: "/juknis/juknis-lkti.pdf",
  },
  {
    id: "speech",
    title: "Speech Contest",
    subtitle: "English Speech Competition",
    image: "/guidebook-speech.png",
    juknis: "/juknis/juknis-speech.pdf",
  },
  {
    id: "olimpiade",
    title: "Olimpiade MIPA",
    subtitle: "Matematika & IPA",
    image: "/guidebook-olimpiade.png",
    juknis: "/juknis/juknis-olimpiade-mipa.pdf",
  },
];

export default function GuidebookPins() {
  return (
    <section className="relative z-10 py-20 px-6 sm:px-10 bg-transparent">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-slate-900"
            style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
          >
            Buku <span className="text-amber-500">Panduan</span> Lomba
          </h2>
          <p className="text-slate-600 text-lg">
            Klik badge di bawah untuk membuka juknis resmi masing-masing bidang lomba.
          </p>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
        {guidebooks.map((book, i) => (
          <motion.a
            key={book.id}
            href={book.juknis}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{
              delay: i * 0.12,
              duration: 0.6,
              type: "spring",
              stiffness: 120,
              damping: 18,
            }}
            whileHover={{
              y: -14,
              scale: 1.08,
              rotate: [0, -3, 3, 0],
              transition: { type: "spring", stiffness: 300, damping: 15 },
            }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-4 group cursor-pointer"
          >
            {/* Badge/Pin Image */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44">
              <div className="absolute inset-0 bg-amber-200/30 rounded-full blur-2xl group-hover:bg-amber-300/50 transition-all duration-500" />
              <Image
                src={book.image}
                alt={`Badge ${book.title}`}
                fill
                className="object-contain drop-shadow-xl group-hover:drop-shadow-2xl transition-all duration-300 relative z-10"
                sizes="(max-width: 768px) 128px, 176px"
              />
            </div>

            {/* Label */}
            <div className="text-center">
              <h3
                className="font-bold text-slate-800 text-base sm:text-lg tracking-wide group-hover:text-amber-600 transition-colors"
                style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
              >
                {book.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{book.subtitle}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                📄 Buka Juknis
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
