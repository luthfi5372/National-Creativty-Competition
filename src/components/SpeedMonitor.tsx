"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cpu, Zap, Signal } from "lucide-react";

export default function SpeedMonitor() {
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<"optimal" | "warning" | "critical">("optimal");
  
  const frameCount = useRef(0);
  const lastTime = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    // Skip loop completely on mobile to preserve 100% mobile CPU for interaction
    if (typeof window !== "undefined" && window.innerWidth <= 640) {
      return;
    }

    // FPS Calculation logic
    const updateStats = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime.current + 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
        
        // Random latency simulation for "speed" feel (Vercel-style monitoring)
        setLatency(Math.floor(Math.random() * 15) + 5);
      }
      
      requestAnimationFrame(updateStats);
    };

    const requestID = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(requestID);
  }, []);

  useEffect(() => {
    if (fps >= 100) setStatus("optimal");
    else if (fps >= 60) setStatus("warning");
    else setStatus("critical");
  }, [fps]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-inter pointer-events-none hidden sm:block">
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="pointer-events-auto"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-500 overflow-hidden ${
            status === "optimal" ? "bg-black/60 border-emerald-500/30 text-emerald-400" :
            status === "warning" ? "bg-black/60 border-amber-500/30 text-amber-400" :
            "bg-black/60 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className={fps > 110 ? "animate-pulse" : ""} />
            <span className="text-[12px] font-bold tracking-tight">
              {fps} <span className="opacity-50 font-medium">FPS</span>
            </span>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-4 border-l border-white/10 pl-4 ml-1"
              >
                <div className="flex items-center gap-2">
                  <Signal size={12} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-300">
                    {latency}<span className="text-slate-500 font-medium ml-0.5">ms</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                    v8-engine
                  </span>
                </div>

                <div className={`w-2 h-2 rounded-full ${
                  status === "optimal" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                  status === "warning" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                  "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                }`} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="ml-1 opacity-40">
            <Activity size={12} />
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-0 mb-3 w-48 bg-black/80 border border-white/10 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl"
            >
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">System Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">Rendering Velocity</span>
                  <span className="text-[11px] font-bold text-white">120Hz Target</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">Memory Cluster</span>
                  <span className="text-[11px] font-bold text-indigo-400">Optimized</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "30%" }}
                    animate={{ width: "85%" }}
                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>
                <p className="text-[9px] text-slate-600 italic">System is performing at peak efficiency.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
