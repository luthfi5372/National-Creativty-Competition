"use server";

import { unstable_cache } from 'next/cache';
import { createClient as createBaseClient } from '@supabase/supabase-js';

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

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-disabled.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

  return createBaseClient(supabaseUrl, serviceRoleKey || anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Cache the public statistics query using a cookie-free client
const getCachedEntries = unstable_cache(
  async () => {
    const supabase = getSupabaseClient();
    const { data: supabaseEntries, error } = await supabase
      .from("competition_entries")
      .select("category, competition_type, city, province, school_name, payment_status");

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
    const supabaseEntries = await getCachedEntries();

    if (!supabaseEntries || supabaseEntries.length === 0) {
      return defaultStats;
    }

    // Hitung semua peserta aktif (kecualikan yang Rejected)
    const allEntries = supabaseEntries.filter(e => e.payment_status !== 'Rejected');

    const breakdown = { "Olimpiade MIPA": 0, "Speech Contest": 0, "LKTI Nasional": 0, "MTQ Nasional": 0 };
    const regionStats = { "Sumatera": 0, "Jawa": 0, "Kalimantan": 0, "Sulawesi": 0, "Papua": 0, "Bali & Nusa Tenggara": 0 };
    const detailedStats: Record<string, number> = {};
    const activeProvinces = new Set<string>();

    allEntries.forEach(entry => {
      // 1. Normalisasi Kategori Bidang Lomba
      const catRaw = (entry.competition_type || entry.category || "")?.trim().toUpperCase();
      let cat = "";
      if (catRaw.includes("SPEECH")) {
        cat = "Speech Contest";
      } else if (catRaw.includes("MIPA") || catRaw.includes("OLIMPIADE")) {
        cat = "Olimpiade MIPA";
      } else if (catRaw.includes("MTQ")) {
        cat = "MTQ Nasional";
      } else if (catRaw.includes("LKTI")) {
        cat = "LKTI Nasional";
      }

      if (cat && (breakdown as any)[cat] !== undefined) {
        (breakdown as any)[cat]++;
      }
      
      // 2. Normalisasi Nama Provinsi agar 100% sinkron dengan D3 GeoJSON Map
      let prov = (entry.province || "")?.toUpperCase()?.trim();
      const city = (entry.city || "")?.toUpperCase()?.trim();
      const school = (entry.school_name || "")?.toUpperCase()?.trim();

      // Fallback jika provinsi berisi tanda "-" atau kosong
      if (!prov || prov === "-" || prov === "UNDEFINED") {
        prov = city;
      }
      if (!prov || prov === "-" || prov === "UNDEFINED") {
        if (/JOMBANG|DARUL ULUM|MALANG|KEDIRI|SURABAYA|JEMBER|NGANJUK|MADIUN|SIDOARJO|MOJOKERTO|BLITAR|PASURUAN|PONOROGO/i.test(school)) {
          prov = "JAWA TIMUR";
        } else if (/JAKARTA/i.test(school)) {
          prov = "DKI JAKARTA";
        } else if (/BANDUNG|BOGOR|BEKASI|DEPOK/i.test(school)) {
          prov = "JAWA BARAT";
        } else if (/SEMARANG|SOLO|SURAKARTA/i.test(school)) {
          prov = "JAWA TENGAH";
        }
      }

      if (prov && prov !== "-") {
        // Pemetaan variasi nama provinsi ke fitur koordinat peta D3
        if (prov === "ACEH" || prov === "NANGGROE ACEH DARUSSALAM") prov = "DI. ACEH";
        else if (prov === "DI YOGYAKARTA" || prov === "YOGYAKARTA" || prov === "DIY") prov = "DAERAH ISTIMEWA YOGYAKARTA";
        else if (prov.includes("BANGKA")) prov = "BANGKA BELITUNG";
        else if (prov === "PROVINSI BANTEN" || prov === "BANTEN") prov = "PROBANTEN";
        else if (prov === "NUSA TENGGARA BARAT" || prov === "NTB") prov = "NUSATENGGARA BARAT";
        else if (prov === "NUSA TENGGARA TIMUR" || prov === "NTT") prov = "NUSA TENGGARA TIMUR";
        else if (prov === "KEPULAUAN RIAU" || prov === "KEPRI") prov = "RIAU";
        else if (prov === "KALIMANTAN UTARA" || prov === "KALTARA") prov = "KALIMANTAN TIMUR";
        else if (prov === "SULAWESI BARAT" || prov === "SULBAR") prov = "SULAWESI SELATAN";
        else if (/PAPUA BARAT|PAPUA BARAT DAYA/i.test(prov)) prov = "IRIAN JAYA BARAT";
        else if (/PAPUA TENGAH|PAPUA PEGUNUNGAN/i.test(prov)) prov = "IRIAN JAYA TENGAH";
        else if (/PAPUA|PAPUA SELATAN/i.test(prov)) prov = "IRIAN JAYA TIMUR";
        
        activeProvinces.add(prov);
        detailedStats[prov] = (detailedStats[prov] || 0) + 1;
        const region = PROVINCE_TO_REGION[prov] || "Jawa";
        if ((regionStats as any)[region] !== undefined) {
          (regionStats as any)[region]++;
        }
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
