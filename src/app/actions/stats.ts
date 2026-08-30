"use server";

import { unstable_cache } from 'next/cache';
import { createClient as createBaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-disabled.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Create a cookie-free base client using service role key if available to bypass RLS
const baseSupabase = createBaseClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PROVINCE_TO_REGION: Record<string, string> = {
  "DI. ACEH": "Sumatera", "SUMATERA UTARA": "Sumatera", "SUMATERA BARAT": "Sumatera", "RIAU": "Sumatera", "JAMBI": "Sumatera", "SUMATERA SELATAN": "Sumatera", "BENGKULU": "Sumatera", "LAMPUNG": "Sumatera", "BANGKA BELITUNG": "Sumatera", "KEPULAUAN RIAU": "Sumatera",
  "DKI JAKARTA": "Jawa", "JAWA BARAT": "Jawa", "JAWA TENGAH": "Jawa", "DAERAH ISTIMEWA YOGYAKARTA": "Jawa", "JAWA TIMUR": "Jawa", "PROBANTEN": "Jawa",
  "BALI": "Bali & Nusa Tenggara", "NUSATENGGARA BARAT": "Bali & Nusa Tenggara", "NUSA TENGGARA TIMUR": "Bali & Nusa Tenggara",
  "KALIMANTAN BARAT": "Kalimantan", "KALIMANTAN TENGAH": "Kalimantan", "KALIMANTAN SELATAN": "Kalimantan", "KALIMANTAN TIMUR": "Kalimantan", "KALIMANTAN UTARA": "Kalimantan",
  "SULAWESI UTARA": "Sulawesi", "SULAWESI TENGAH": "Sulawesi", "SULAWESI SELATAN": "Sulawesi", "SULAWESI TENGGARA": "Sulawesi", "GORONTALO": "Sulawesi", "SULAWESI BARAT": "Sulawesi",
  "MALUKU": "Papua", "MALUKU UTARA": "Papua", "IRIAN JAYA BARAT": "Papua", "IRIAN JAYA TENGAH": "Papua", "IRIAN JAYA TIMUR": "Papua"
};

export interface GlobalStats {
  totalParticipants: number;
  provinces: number;
  categories: number;
  categoryBreakdown: Record<string, number>;
  regionStats: Record<string, number>;
  detailedProvinceStats: Record<string, number>;
}

// Cache the public statistics query using a cookie-free client
const getCachedEntries = unstable_cache(
  async () => {
    const { data: supabaseEntries, error } = await baseSupabase
      .from("competition_entries")
      .select("category, competition_type, city, province, payment_status");

    if (error) {
      console.error("Supabase cached stats fetch error in action:", error);
      return [];
    }
    return supabaseEntries || [];
  },
  ['global-stats-entries-live'],
  { revalidate: 5 }
);

export async function getLiveStatsAction(): Promise<GlobalStats> {
  const defaultStats: GlobalStats = {
    totalParticipants: 0,
    provinces: 0,
    categories: 4,
    categoryBreakdown: { "Olimpiade MIPA": 0, "Speech Contest": 0, "LKTI Nasional": 0, "MTQ Nasional": 0 },
    regionStats: { "Sumatera": 0, "Jawa": 0, "Kalimantan": 0, "Sulawesi": 0, "Papua": 0, "Bali & Nusa Tenggara": 0 },
    detailedProvinceStats: {}
  };

  try {
    // Fetch cached entries without cookie dependency
    const supabaseEntries = await getCachedEntries();

    if (!supabaseEntries || supabaseEntries.length === 0) {
      return defaultStats;
    }

    // Hitung SEMUA pendaftar (termasuk Pending, Verified, dll) - jangan filter berdasarkan payment_status
    // Hanya exclude yang Rejected saja
    const allEntries = supabaseEntries.filter(e => e.payment_status !== 'Rejected');

    const breakdown = { "Olimpiade MIPA": 0, "Speech Contest": 0, "LKTI Nasional": 0, "MTQ Nasional": 0 };
    const regionStats = { "Sumatera": 0, "Jawa": 0, "Kalimantan": 0, "Sulawesi": 0, "Papua": 0, "Bali & Nusa Tenggara": 0 };
    const detailedStats: Record<string, number> = {};
    const activeProvinces = new Set<string>();

    allEntries.forEach(entry => {
      // Normalisasi Kategori Bidang Lomba
      let cat = (entry.competition_type || entry.category || "")?.trim();
      if (cat === "MTQ") cat = "MTQ Nasional";
      if (cat === "LKTI") cat = "LKTI Nasional";
      if (cat === "MIPA") cat = "Olimpiade MIPA";

      if ((breakdown as any)[cat] !== undefined) (breakdown as any)[cat]++;
      
      // Normalisasi Nama Provinsi agar sinkron dengan ID Map
      let prov = (entry.province || entry.city)?.toUpperCase()?.trim();
      
      if (prov) {
        // Fallback mapping untuk variasi nama provinsi ke ID Map D3
        if (prov === "ACEH") prov = "DI. ACEH";
        if (prov === "DI YOGYAKARTA" || prov === "YOGYAKARTA") prov = "DAERAH ISTIMEWA YOGYAKARTA";
        if (prov === "KEPULAUAN BANGKA BELITUNG") prov = "BANGKA BELITUNG";
        if (prov === "PROVINSI BANTEN" || prov === "BANTEN") prov = "PROBANTEN";
        if (prov === "NUSA TENGGARA BARAT") prov = "NUSATENGGARA BARAT";
        if (prov === "PAPUA BARAT" || prov === "PAPUA BARAT DAYA") prov = "IRIAN JAYA BARAT";
        if (prov === "PAPUA TENGAH" || prov === "PAPUA PEGUNUNGAN") prov = "IRIAN JAYA TENGAH";
        if (prov === "PAPUA" || prov === "PAPUA SELATAN") prov = "IRIAN JAYA TIMUR";
        
        activeProvinces.add(prov);
        detailedStats[prov] = (detailedStats[prov] || 0) + 1;
        const region = PROVINCE_TO_REGION[prov] || "Jawa";
        if ((regionStats as any)[region] !== undefined) (regionStats as any)[region]++;
      }
    });

    return {
      totalParticipants: allEntries.length || 0,
      provinces: activeProvinces.size,
      categories: 4,
      categoryBreakdown: breakdown,
      regionStats,
      detailedProvinceStats: detailedStats
    };
  } catch (err) {
    console.error("getLiveStatsAction error:", err);
    return defaultStats;
  }
}
