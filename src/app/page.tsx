"use client";

import dynamic from "next/dynamic";
import SmoothScroll from "@/components/SmoothScroll";

// Heavy components with browser APIs loaded dynamically
const ParallaxBackground = dynamic(() => import("@/components/ParallaxBackground"), { ssr: false });

const IndonesiaMap = dynamic(() => import("@/components/IndonesiaMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full max-w-7xl mx-auto min-h-[500px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-xl border border-white rounded-[3.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)]">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Menghubungkan Peta Sebaran...</p>
    </div>
  )
});

const GallerySection = dynamic(() => import("@/components/GallerySection"), { 
  ssr: false,
  loading: () => (
    <div className="w-full max-w-7xl mx-auto min-h-[400px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Menyiapkan Galeri Acara...</p>
    </div>
  )
});

const SpeedMonitor = dynamic(() => import("@/components/SpeedMonitor"), { ssr: false });

// Standard interactive components
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SponsorsSection from "@/components/SponsorsSection";
import FeatureGrid from "@/components/FeatureGrid";
import CategoryCards from "@/components/CategoryCards";
import Footer from "@/components/Footer";

const PricingSection = dynamic(() => import("@/components/PricingSection"), { ssr: false });
const FAQSection = dynamic(() => import("@/components/FAQSection"), { ssr: false });
const TimelineSection = dynamic(() => import("@/components/TimelineSection"), { ssr: false });

export default function Home() {
  return (
    <SmoothScroll>
      <div className="relative scroll-smooth selection:bg-indigo-500/30 bg-slate-50">
        <ParallaxBackground />
        <Navbar />
        <div className="fixed bottom-6 right-6 z-[60]">
          <SpeedMonitor />
        </div>

        <main className="w-full">
          <section id="beranda" className="min-h-screen w-full flex items-center justify-center">
            <HeroSection />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <FeatureGrid />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <GallerySection />
          </section>

          <div className="content-auto">
            <SponsorsSection />
          </div>

          <section id="kategori" className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <CategoryCards />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <PricingSection />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <IndonesiaMap />
          </section>

          <div className="content-auto">
            <TimelineSection />
          </div>

          <section id="faq" className="min-h-screen w-full py-24 flex items-center justify-center content-auto">
            <FAQSection />
          </section>

          <section id="kontak" className="w-full content-auto">
            <Footer />
          </section>
        </main>
      </div>
    </SmoothScroll>
  );
}
