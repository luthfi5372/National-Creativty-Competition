"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Mic,
  MessageCircle,
  Volume2,
  BookOpen,
  PenTool,
  Microscope,
  Atom,
  Star,
  Moon,
  Book,
  Rocket,
  Calculator,
  Telescope,
  Dna,
} from "lucide-react";

const categoryIcons = [
  { icons: [Mic, MessageCircle, Volume2], color: "text-red-400" },          // Speech
  { icons: [BookOpen, PenTool, Microscope, Atom], color: "text-emerald-400" }, // LKTI
  { icons: [Star, Moon, Book], color: "text-amber-400" },                   // MTQ
  { icons: [Rocket, Calculator, Telescope, Dna], color: "text-blue-400" }     // MIPA
];

// Flat array to pick randomly but know the color
const allIconsMapped = categoryIcons.flatMap(cat => 
  cat.icons.map(Icon => ({ Icon, color: cat.color }))
);

export default function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // Check mobile before generating elements to save mobile CPU/battery
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();

    const count = window.innerWidth <= 768 ? 25 : 60;
    const generated = [];
    for (let i = 0; i < count; i++) {
      const itemConfig = allIconsMapped[i % allIconsMapped.length];
      
      // True random positioning for natural, scattered distribution
      const x = Math.random() * 100; // 0 to 100 vw
      const y = Math.random() * 650; // 0 to 650 vh
      
      const size = 32 + Math.floor(Math.random() * 50); // 32px to 82px
      const depth = 1 + Math.floor(Math.random() * 3); // 1 to 3 depth
      const opacity = 0.15 + (Math.random() * 0.18); // 15% to 33% opacity
      const blur = depth > 2 ? "blur(1px)" : "blur(0px)";
      const animClass = `float-anim-${(i % 3) + 1}`;
      const animDelay = (Math.random() * 8).toFixed(1);
      const animDuration = (22 + (Math.random() * 16)).toFixed(1);

      generated.push({
        id: i,
        Icon: itemConfig.Icon,
        color: itemConfig.color,
        x,
        y,
        size,
        depth,
        opacity,
        blur,
        animClass,
        animDelay,
        animDuration
      });
    }
    setItems(generated);
    setMounted(true);

    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useGSAP(() => {
    if (!mounted || isMobile || items.length === 0) return; // Completely skip heavy scroll triggers on mobile or before loaded
    gsap.registerPlugin(ScrollTrigger);

    // Group-based animation by depth levels (1 to 4)
    for (let d = 1; d <= 4; d++) {
      gsap.to(`.parallax-depth-${d}`, {
        y: () => -1 * window.innerHeight * d * 0.8, // Smooth speed parallax offset
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        }
      });
    }
    
  }, { scope: containerRef, dependencies: [mounted, isMobile, items] });

  // Hide before mounted to prevent hydration errors or flashes
  if (!mounted || items.length === 0) return null;

  // Reduce background clutter on mobile but keep enough to feel rich ("biar rame")
  const displayedItems = isMobile ? items.slice(0, 45) : items;

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }} // Put behind everything
    >
      <style>{`
        @keyframes floatDynamics1 {
          0% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(12px) rotate(120deg); }
          66% { transform: translateY(15px) translateX(-8px) rotate(240deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(360deg); }
        }
        @keyframes floatDynamics2 {
          0% { transform: translateY(0px) translateX(0px) rotate(360deg); }
          50% { transform: translateY(25px) translateX(-15px) rotate(180deg); }
          100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
        }
        @keyframes floatDynamics3 {
          0% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-30px) scale(1.08) rotate(-90deg); }
          100% { transform: translateY(0px) scale(1) rotate(0deg); }
        }
        .float-anim-1 {
          animation: floatDynamics1 24s linear infinite;
          will-change: transform;
        }
        .float-anim-2 {
          animation: floatDynamics2 28s ease-in-out infinite;
          will-change: transform;
        }
        .float-anim-3 {
          animation: floatDynamics3 22s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      <div className="absolute inset-0 bg-slate-50" /> {/* Solid background at the very back */}
      
      {displayedItems.map((item) => (
        <div
          key={item.id}
          className={`parallax-item parallax-depth-${item.depth} absolute ${item.color}`}
          data-depth={item.depth}
          style={{
            left: `${item.x}vw`,
            top: `${item.y}vh`,
            opacity: isMobile ? item.opacity * 0.6 : item.opacity, // Clear presence on both desktop & mobile
            filter: isMobile ? "blur(1.5px)" : item.blur, 
            willChange: "transform",
          }}
        >
          <div 
            className={item.animClass}
            style={{
              animationDelay: `${item.animDelay}s`,
              animationDuration: `${item.animDuration}s`,
              transformOrigin: "center center"
            }}
          >
            <item.Icon size={isMobile ? item.size * 0.6 : item.size} strokeWidth={1.5} />
          </div>
        </div>
      ))}
      
      {/* Subtle overlay to fade out overlapping icons at the very top and bottom */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-50 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-10" />
    </div>
  );
}
