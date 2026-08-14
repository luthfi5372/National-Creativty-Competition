"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  MotionValue,
} from "framer-motion";
import { Users, BookOpen, Mic, Medal, Book } from "lucide-react";
import TextAnimate from "./ui/TextAnimate";
import LineDrawIcon from "./ui/LineDrawIcon";
import { useLiveStats } from "@/hooks/useLiveStats";

// ─── Data ───────────────────────────────────────────────────────────────────
const stats = [
  {
    category: "Olimpiade MIPA",
    count: 0,
    icon: BookOpen,
    image: "/guidebook-olimpiade.png",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    accentFrom: "from-blue-400",
    accentTo: "to-blue-600",
    desc: "Siswa SMA/SMK sederajat dari seluruh Indonesia bertanding dalam bidang Sains.",
  },
  {
    category: "Speech Contest",
    count: 0,
    icon: Mic,
    image: "/guidebook-speech.png",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    accentFrom: "from-emerald-400",
    accentTo: "to-emerald-600",
    desc: "Menampilkan kemampuan public speaking dan kefasihan berbahasa Inggris.",
  },
  {
    category: "LKTI Nasional",
    count: 0,
    icon: Medal,
    image: "/guidebook-lkti.png",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
    accentFrom: "from-purple-400",
    accentTo: "to-purple-600",
    desc: "Karya tulis ilmiah inovatif yang menjawab tantangan masa depan.",
  },
  {
    category: "MTQ Nasional",
    count: 0,
    icon: Book,
    image: "/guidebook-mtq.png",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    accentFrom: "from-amber-400",
    accentTo: "to-amber-600",
    desc: "Musabaqah Tilawatil Quran tingkat nasional bagi generasi muda islami.",
  },
];



// ─── ScrollLinkedNumber ──────────────────────────────────────────────────────
// Reads a shared scrollProgress and maps it to [0 → target] (up) and back to 0 (down).
//   inputRange:  [startShow, peakShow]   – when to count UP
//   outputRange: [0, value]
function ScrollLinkedNumber({
  value,
  scrollProgress,
  inputRange,
  className = "",
}: {
  value: number;
  scrollProgress: MotionValue<number>;
  inputRange: [number, number];
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  /**
   *  Scroll goes: 0 → inputRange[0] → inputRange[1] → 1
   *  Map:          0 →      0       →    value       → 0
   *  This means the number climbs as the user scrolls IN and falls as they scroll OUT.
   */
  const raw = useTransform(
    scrollProgress,
    [0, inputRange[0], inputRange[1], inputRange[1] + 0.25, 1],
    [0, 0, value, value, 0]
  );

  const smoothed = useSpring(raw, { stiffness: 60, damping: 18, mass: 0.8 });

  useMotionValueEvent(smoothed, "change", (latest) => {
    if (ref.current) {
      ref.current.textContent = Math.round(latest).toLocaleString("id-ID");
    }
  });

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({
  scrollProgress,
  inputRange,
  accentFrom,
  accentTo,
}: {
  scrollProgress: MotionValue<number>;
  inputRange: [number, number];
  accentFrom: string;
  accentTo: string;
}) {
  const width = useTransform(
    scrollProgress,
    [0, inputRange[0], inputRange[1], inputRange[1] + 0.25, 1],
    ["0%", "0%", "100%", "100%", "0%"]
  );

  return (
    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-auto">
      <motion.div
        style={{ width }}
        className={`h-full bg-gradient-to-r ${accentFrom} ${accentTo} rounded-full`}
      />
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { stats: liveStats } = useLiveStats();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"], // starts when section bottom hits viewport bottom, ends when top leaves viewport top
  });

  return (
    <section
      ref={sectionRef}
      id="statistik"
      className="relative z-10 max-w-7xl mx-auto px-6 py-24"
    >
      {/* ── Heading ── */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2
          className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <TextAnimate text="Partisipasi" type="word" />{" "}
          <TextAnimate text="Peserta NCC 13" type="word" className="text-indigo-600" />.
        </h2>
        <p className="text-slate-600 text-lg leading-relaxed">
          Statistik pendaftar yang telah bergabung dalam masing-masing bidang kompetisi tahun ini.
        </p>
      </div>

      {/* ── Cards ── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start max-w-7xl mx-auto">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          // Space the trigger windows across scroll progress
          const start = 0.05 + i * 0.05;
          const peak  = start + 0.3;
          const inputRange: [number, number] = [start, peak];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              // NOTE: "once: false" so it can disappear when scrolled away
              viewport={{ once: false, margin: "0px 0px -80px 0px" }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 90,
                damping: 20,
              }}
              whileHover={{
                y: -8,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className={`relative rounded-3xl p-6 flex flex-col items-center text-center bg-white border ${stat.borderColor} shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-shadow cursor-default h-full`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${stat.bgColor} flex items-center justify-center mb-6 overflow-hidden`}>
                <img src={stat.image} alt={stat.category} className="w-12 h-12 object-contain drop-shadow-md" loading="lazy" />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 mb-2">{stat.category}</h3>

              {/* Scroll-linked Counter */}
              <div className="flex items-baseline gap-1.5 mb-4">
                <ScrollLinkedNumber
                  value={liveStats.categoryBreakdown[stat.category] ?? stat.count}
                  scrollProgress={scrollYProgress}
                  inputRange={inputRange}
                  className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Peserta
                </span>
              </div>

              {/* Description */}
              <p className="text-[13px] text-slate-500 leading-relaxed mb-6 flex-1">
                {stat.desc}
              </p>

              {/* Scroll-linked Progress Bar */}
              <ProgressBar
                scrollProgress={scrollYProgress}
                inputRange={inputRange}
                accentFrom={stat.accentFrom}
                accentTo={stat.accentTo}
              />

              <div className="flex justify-between w-full mt-2">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Target
                </span>
                <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider">
                  NCC 13
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Total Badge ── */}
      <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 font-bold text-sm">
          <Users size={18} />
          Total:{" "}
          <ScrollLinkedNumber
            value={liveStats.totalParticipants}
            scrollProgress={scrollYProgress}
            inputRange={[0.2, 0.55]}
            className="tabular-nums"
          />{" "}
          Pendaftar
        </div>
        <p className="text-sm text-slate-400 font-medium">
          Data diperbarui secara real-time dari sistem pendaftaran.
        </p>
      </div>
    </section>
  );
}
