"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveStats } from "@/hooks/useLiveStats";
import { Info, TrendingUp, Users, MousePointer2, Map as MapIcon, MapPin, FileText, Sparkles, ExternalLink, BookOpen } from "lucide-react";
import * as d3 from "d3-geo";
import geoData from "@/data/indonesia-simple.json";

// Mapping provinces to major regions for coloring/stats
const PROVINCE_TO_REGION: Record<string, string> = {
  // Sumatera
  "DI. ACEH": "Sumatera", 
  "SUMATERA UTARA": "Sumatera", 
  "SUMATERA BARAT": "Sumatera", 
  "RIAU": "Sumatera", 
  "JAMBI": "Sumatera", 
  "SUMATERA SELATAN": "Sumatera", 
  "BENGKULU": "Sumatera", 
  "LAMPUNG": "Sumatera", 
  "BANGKA BELITUNG": "Sumatera", 
  "KEPULAUAN RIAU": "Sumatera",
  // Jawa
  "DKI JAKARTA": "Jawa", 
  "JAWA BARAT": "Jawa", 
  "JAWA TENGAH": "Jawa", 
  "DAERAH ISTIMEWA YOGYAKARTA": "Jawa", 
  "JAWA TIMUR": "Jawa", 
  "PROBANTEN": "Jawa",
  // Bali & Nusa Tenggara
  "BALI": "Bali & Nusa Tenggara", 
  "NUSATENGGARA BARAT": "Bali & Nusa Tenggara", 
  "NUSA TENGGARA TIMUR": "Bali & Nusa Tenggara",
  // Kalimantan
  "KALIMANTAN BARAT": "Kalimantan", 
  "KALIMANTAN TENGAH": "Kalimantan", 
  "KALIMANTAN SELATAN": "Kalimantan", 
  "KALIMANTAN TIMUR": "Kalimantan", 
  "KALIMANTAN UTARA": "Kalimantan",
  // Sulawesi
  "SULAWESI UTARA": "Sulawesi", 
  "SULAWESI TENGAH": "Sulawesi", 
  "SULAWESI SELATAN": "Sulawesi", 
  "SULAWESI TENGGARA": "Sulawesi", 
  "GORONTALO": "Sulawesi", 
  "SULAWESI BARAT": "Sulawesi",
  // Papua
  "MALUKU": "Papua", 
  "MALUKU UTARA": "Papua", 
  "IRIAN JAYA BARAT": "Papua", 
  "IRIAN JAYA TENGAH": "Papua", 
  "IRIAN JAYA TIMUR": "Papua"
};

const REGIONS = ["Sumatera", "Jawa", "Bali & Nusa Tenggara", "Kalimantan", "Sulawesi", "Papua"];

class Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  baseSize: number;
  color: string;
  baseColor: string;
  density: number;
  opacity: number;
  baseOpacity: number;
  vx: number = 0;
  vy: number = 0;

  constructor(x: number, y: number, color: string) {
    this.baseX = x;
    this.baseY = y;
    this.x = x + (Math.random() - 0.5) * 20; // Slight initial offset
    this.y = y + (Math.random() - 0.5) * 20;
    this.baseSize = 1.6 + Math.random() * 0.8;
    this.size = this.baseSize;
    this.baseColor = color;
    this.color = color;
    this.baseOpacity = 0.25 + Math.random() * 0.4;
    this.opacity = this.baseOpacity;
    this.density = (Math.random() * 25) + 15;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    
    // Subtle glow if highly active
    if (this.opacity > 0.8) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
    } else {
      ctx.shadowBlur = 0;
    }
  }

  update(mouse: { x: number | null, y: number | null, radius: number }) {
    if (mouse.x !== null && mouse.y !== null) {
      // Calculate distance from base position to cursor
      const dx = mouse.x - this.baseX;
      const dy = mouse.y - this.baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        
        // "Lifting" effect: move up (negative Y offset) and scale up
        // Reduced lift height as requested (from 45 to 25)
        const lift = force * 25; 
        const targetX = this.baseX;
        const targetY = this.baseY - lift;

        // Smoothly move towards the lifted target position
        this.x += (targetX - this.x) * 0.25;
        this.y += (targetY - this.y) * 0.25;
        
        // Increase size and set a visible color (Indigo instead of White)
        this.size = this.baseSize * (1 + force * 1.5);
        this.opacity = Math.min(1, this.baseOpacity + force * 0.8);
        this.color = "#4f46e5"; // Visible Indigo 600
      } else {
        // Return to base position with easing
        this.x += (this.baseX - this.x) * 0.15;
        this.y += (this.baseY - this.y) * 0.15;
        
        this.size += (this.baseSize - this.size) * 0.15;
        this.opacity = Math.max(this.baseOpacity, this.opacity - 0.02);
        this.color = this.baseColor;
      }
    } else {
      // Natural return if mouse is null
      this.x += (this.baseX - this.x) * 0.1;
      this.y += (this.baseY - this.y) * 0.1;
      this.size += (this.baseSize - this.size) * 0.1;
      this.opacity = Math.max(this.baseOpacity, this.opacity - 0.01);
      this.color = this.baseColor;
    }
  }
}

const GUIDEBOOK_PINS = [
  {
    id: "mtq",
    title: "MTQ",
    subtitle: "Musabaqah Tilawatil Quran",
    image: "/guidebook-mtq.png",
    pdfUrl: "/juknis/juknis-mtq.pdf",
  },
  {
    id: "lkti",
    title: "LKTI",
    subtitle: "Lomba Karya Tulis Ilmiah",
    image: "/guidebook-lkti.png",
    pdfUrl: "/juknis/juknis-lkti.pdf",
  },
  {
    id: "speech",
    title: "Speech Contest",
    subtitle: "English Speech Competition",
    image: "/guidebook-speech.png",
    pdfUrl: "/juknis/juknis-speech.pdf",
  },
  {
    id: "olimpiade",
    title: "Olimpiade MIPA",
    subtitle: "Matematika & IPA",
    image: "/guidebook-olimpiade.png",
    pdfUrl: "/juknis/juknis-olimpiade-mipa.pdf",
  },
];

export default function IndonesiaMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { stats } = useLiveStats();
  const particles = useRef<(Particle & { province?: string })[]>([]);
  const mouse = useRef({ x: null as number | null, y: null as number | null, radius: 100 });
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; count: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  const PROVINCE_LIST = [
    "DI. ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "JAMBI", "SUMATERA SELATAN", "BENGKULU", "LAMPUNG", 
    "BANGKA BELITUNG", "KEPULAUAN RIAU", "DKI JAKARTA", "JAWA BARAT", "JAWA TENGAH", "DAERAH ISTIMEWA YOGYAKARTA", 
    "JAWA TIMUR", "PROBANTEN", "BALI", "NUSATENGGARA BARAT", "NUSA TENGGARA TIMUR", "KALIMANTAN BARAT", 
    "KALIMANTAN TENGAH", "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "SULAWESI UTARA", 
    "SULAWESI TENGAH", "SULAWESI SELATAN", "SULAWESI TENGGARA", "GORONTALO", "SULAWESI BARAT", "MALUKU", 
    "MALUKU UTARA", "IRIAN JAYA BARAT", "IRIAN JAYA TENGAH", "IRIAN JAYA TIMUR"
  ];

  // Color palette based on activity level
  const getProvinceColor = (count: number) => {
    if (count > 50) return "#4f46e5"; // Active Indigo
    if (count > 20) return "#6366f1"; // Medium Indigo
    if (count > 0) return "#818cf8";  // Low Indigo
    return "#475569"; // Inactive Slate
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const w = Math.floor(width);
        const h = Math.floor(width * 0.45);
        setDimensions({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const spacing = 7;
    const p: any[] = [];

    const projection = d3.geoMercator()
      .fitSize([dimensions.width, dimensions.height], geoData as any);
    
    const pathGenerator = d3.geoPath().projection(projection);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    if (!tempCtx) return;

    (geoData as any).features.forEach((feature: any) => {
      const provinceName = feature.properties.Propinsi;
      const provIndex = PROVINCE_LIST.indexOf(provinceName);
      
      // Store province index in G channel
      tempCtx.fillStyle = `rgb(0, ${provIndex + 1}, 0)`;
      
      const pathStr = pathGenerator(feature);
      if (pathStr) {
        const path2d = new Path2D(pathStr);
        tempCtx.fill(path2d);
      }
    });

    const imageData = tempCtx.getImageData(0, 0, dimensions.width, dimensions.height).data;
    
    for (let y = 0; y < dimensions.height; y += spacing) {
      for (let x = 0; x < dimensions.width; x += spacing) {
        const index = (y * dimensions.width + x) * 4;
        const gValue = imageData[index + 1]; // Province index + 1
        
        if (gValue > 0) {
          const provName = PROVINCE_LIST[gValue - 1] || "Unknown";
          const activityCount = stats.detailedProvinceStats[provName] || 0;
          const color = getProvinceColor(activityCount);
          const particle = new Particle(x, y, color);
          (particle as any).province = provName;
          p.push(particle);
        }
      }
    }

    particles.current = p;

    if (window.innerWidth <= 768) {
      // Mobile: Draw static particles once to completely eliminate CPU/GPU rendering overhead
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      particles.current.forEach(p => {
        p.x = p.baseX;
        p.y = p.baseY;
        p.size = p.baseSize;
        p.opacity = p.baseOpacity;
        p.color = p.baseColor;
        p.draw(ctx);
      });
      return;
    }

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      
      let topHovered: string | null = null;
      let minDistance = 100;

      particles.current.forEach(particle => {
        particle.update(mouse.current);
        particle.draw(ctx);

        // Detect hover for info box
        if (mouse.current.x !== null && mouse.current.y !== null) {
          const dx = mouse.current.x - particle.baseX;
          const dy = mouse.current.y - particle.baseY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 40 && dist < minDistance) {
            minDistance = dist;
            topHovered = (particle as any).province;
          }
        }
      });

      if (topHovered) {
        setHoveredInfo({
          name: topHovered,
          count: stats.detailedProvinceStats[topHovered] || 0
        });
      } else {
        setHoveredInfo(null);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouse.current.x = (e.clientX - rect.left) * scaleX;
      mouse.current.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseLeave = () => {
      mouse.current.x = null;
      mouse.current.y = null;
      setHoveredInfo(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [dimensions, stats]);

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-transparent min-h-screen flex flex-col">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left: Stats & Copy */}
          <div className="lg:w-1/3 space-y-8 z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                <MousePointer2 size={12} className="animate-pulse" /> Precision Geo-Grid
              </div>
              <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                Peta Sebaran <span className="text-indigo-600 relative">
                  Interaktif
                  <svg className="absolute -bottom-2 left-0 w-full h-2 text-indigo-200" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0,5 Q25,0 50,5 T100,5" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h2>
              <p className="text-slate-500 leading-relaxed text-sm">
                Visualisasi partikel real-time menggunakan koordinat geografis presisi. Rasakan interaksi dinamis saat kursor Anda menjelajahi ribuan titik data dari seluruh Indonesia.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group cursor-default">
                <Users size={20} className="text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-2xl font-black text-slate-900">{stats.totalParticipants}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Peserta</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group cursor-default">
                <TrendingUp size={20} className="text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-2xl font-black text-slate-900">{stats.provinces}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Provinsi Aktif</div>
              </div>
            </div>

            {/* Real-time Regional Breakdown Panel */}
            <div className="p-6 bg-white/60 backdrop-blur-md rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Sebaran Wilayah (Real-Time)</h4>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live DB Sync
                </div>
              </div>
              
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(stats.regionStats || {})
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1]) // Sort by highest count first
                  .map(([region, count]) => {
                    const percentage = stats.totalParticipants > 0 
                      ? Math.round((count / stats.totalParticipants) * 100) 
                      : 0;
                    
                    return (
                      <div key={region} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                          <span className="uppercase tracking-tight">{region}</span>
                          <span>{count} Peserta ({percentage}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {(!stats.regionStats || Object.values(stats.regionStats).every(c => c === 0)) && (
                  <p className="text-[11px] text-slate-400 font-medium italic text-center py-2">
                    Belum ada data pendaftar terverifikasi.
                  </p>
                )}
              </div>
              
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed pt-1.5 border-t border-slate-100">
                *Data di atas dihitung otomatis secara real-time dari seluruh berkas pendaftaran peserta yang telah berhasil terverifikasi oleh panitia di database pusat.
              </p>
            </div>

            <div className="p-5 bg-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-indigo-200">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                   <Info size={14} />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Interaction Tip</span>
               </div>
               <p className="text-xs text-indigo-100 font-medium">Bintik akan bereaksi (mengangkat & bercahaya) berdasarkan kedekatan kursor Anda.</p>
            </div>
          </div>

          {/* Right: The High-Fidelity Map */}
          <div className="lg:w-2/3 relative flex flex-col items-center" ref={containerRef}>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-50/50 blur-[100px] rounded-full pointer-events-none -z-10" />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              className="relative w-full bg-white/40 backdrop-blur-xl border border-white rounded-[3.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full cursor-none"
              />
              
              {/* Dynamic Province Tooltip */}
              <AnimatePresence>
                {hoveredInfo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-10 right-10 bg-white/90 backdrop-blur-xl border border-indigo-100 p-6 rounded-[2rem] shadow-2xl z-30 min-w-[200px]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Detail Wilayah</div>
                        <div className="text-sm font-bold text-slate-900">{hoveredInfo.name}</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black text-slate-900 leading-none">{hoveredInfo.count}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pendaftar Terdeteksi</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Region Indicators */}
              <div className="absolute top-6 left-8 flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                <MapIcon size={14} className="text-indigo-600" />
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Indonesia Particle Grid v2.0</span>
              </div>
            </motion.div>

            {/* Custom Status Bar */}
            <div className="mt-8 flex items-center gap-8 px-8 py-4 bg-slate-50 rounded-full border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Low Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">High Volume</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── GUIDEBOOK BADGES / PINS SECTION ─── */}
        <div className="mt-24 pt-16 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200/60 mb-3">
              <Sparkles size={12} className="animate-spin text-amber-500" /> Juknis Resmi Kompetisi
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              Buku Panduan & <span className="text-amber-500">Juknis Lomba</span>
            </h3>
            <p className="text-slate-500 text-sm mt-4 leading-relaxed">
              Klik pin lencana di bawah untuk langsung membuka Petunjuk Teknis (Juknis) resmi sesuai bidang lomba yang Anda ikuti.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {GUIDEBOOK_PINS.map((item, idx) => (
              <motion.a
                key={item.id}
                href={item.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="group relative flex flex-col items-center bg-white/70 backdrop-blur-md border border-slate-200/80 hover:border-amber-400/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer"
              >
                {/* Glow behind badge */}
                <div className="absolute top-10 w-28 h-28 bg-amber-300/20 rounded-full blur-2xl group-hover:bg-amber-400/35 transition-all duration-500 pointer-events-none" />

                {/* Badge Image */}
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-4 flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={`Lencana ${item.title}`}
                    className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-2xl group-hover:rotate-2 transition-all duration-300 relative z-10"
                    loading="lazy"
                  />
                </div>

                {/* Category Title */}
                <h4 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-amber-600 transition-colors text-center"
                    style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))" }}
                >
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 text-center mt-1 mb-4 font-medium">
                  {item.subtitle}
                </p>

                {/* Button Action */}
                <span className="mt-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 group-hover:bg-amber-500 text-amber-700 group-hover:text-white border border-amber-200 group-hover:border-amber-500 text-xs font-bold rounded-xl transition-all duration-300 shadow-sm">
                  <FileText size={13} />
                  <span>Buka Juknis</span>
                  <ExternalLink size={11} className="opacity-70 group-hover:opacity-100" />
                </span>
              </motion.a>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
