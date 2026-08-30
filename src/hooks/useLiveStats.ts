import { useState, useEffect, useCallback } from "react";

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

const defaultStats: GlobalStats = {
  totalParticipants: 0,
  provinces: 0,
  categories: 4,
  categoryBreakdown: { "Olimpiade MIPA": 0, "Speech Contest": 0, "LKTI Nasional": 0, "MTQ Nasional": 0 },
  regionStats: { "Sumatera": 0, "Jawa": 0, "Kalimantan": 0, "Sulawesi": 0, "Papua": 0, "Bali & Nusa Tenggara": 0 },
  detailedProvinceStats: {}
};

export function useLiveStats() {
  const [stats, setStats] = useState<GlobalStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const { getLiveStatsAction } = await import("@/app/actions/stats");
      const liveStats = await getLiveStatsAction();
      setStats(liveStats);
    } catch (err) {
      console.error("useLiveStats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetchStats();

    // Polling every 60 seconds instead of realtime to reduce Supabase connection quota usage
    const pollInterval = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}
