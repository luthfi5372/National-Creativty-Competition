"use client";

import dynamic from "next/dynamic";

// Every single component loaded lazily — nothing touches server
const SmoothScroll = dynamic(() => import("@/components/SmoothScroll"), { ssr: false });
const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const HeroSection = dynamic(() => import("@/components/HeroSection"), { ssr: false });
const FeatureGrid = dynamic(() => import("@/components/FeatureGrid"), { ssr: false });
const CategoryCards = dynamic(() => import("@/components/CategoryCards"), { ssr: false });
const PricingSection = dynamic(() => import("@/components/PricingSection"), { ssr: false });
const FAQSection = dynamic(() => import("@/components/FAQSection"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });
const ParallaxBackground = dynamic(() => import("@/components/ParallaxBackground"), { ssr: false });
const IndonesiaMap = dynamic(() => import("@/components/IndonesiaMap"), { ssr: false });
const GallerySection = dynamic(() => import("@/components/GallerySection"), { ssr: false });
const TimelineSection = dynamic(() => import("@/components/TimelineSection"), { ssr: false });
const SpeedMonitor = dynamic(() => import("@/components/SpeedMonitor"), { ssr: false });

export default function HomeClient() {
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

          <section className="min-h-screen w-full py-24 flex items-center justify-center">
            <FeatureGrid />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center">
            <GallerySection />
          </section>

          <section id="kategori" className="min-h-screen w-full py-24 flex items-center justify-center">
            <CategoryCards />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center">
            <PricingSection />
          </section>

          <section className="min-h-screen w-full py-24 flex items-center justify-center">
            <IndonesiaMap />
          </section>

          <TimelineSection />

          <section id="faq" className="min-h-screen w-full py-24 flex items-center justify-center">
            <FAQSection />
          </section>

          <section id="kontak" className="w-full">
            <Footer />
          </section>
        </main>
      </div>
    </SmoothScroll>
  );
}
