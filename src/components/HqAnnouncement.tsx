"use client";

import { useState, useEffect } from "react";
import { Bell, X, Info, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function HqAnnouncement() {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Fetch announcement
    async function getInitial() {
      const { data } = await supabase
        .from('site_settings')
        .select('live_announcement')
        .eq('id', 1)
        .single();
      
      if (data?.live_announcement && data.live_announcement.length > 5) {
        setMessage(data.live_announcement);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }
    getInitial();

    // Poll every 30 seconds instead of realtime to save Supabase connection quota
    const poll = setInterval(getInitial, 30000);

    return () => {
      clearInterval(poll);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && message && (
        <motion.div 
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4"
        >
          <div className="relative overflow-hidden group">
            {/* Background Layer (Liquid Glass) */}
            <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(79,70,229,0.3)]" />
            
            {/* Animated Shine Effect */}
            <motion.div 
               animate={{ x: ['100%', '-100%'] }}
               transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
               className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />

            <div className="relative px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-yellow-300 ring-2 ring-white/10 shrink-0">
                  <Megaphone size={18} className="animate-bounce" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[3px] mb-0.5">Live Announcement</p>
                   <p className="text-white text-sm font-bold tracking-tight leading-snug">{message}</p>
                </div>
              </div>

              <button 
                onClick={() => setIsVisible(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
