// Utility for merging tailwind classes similar to clsx and tailwind-merge
export function cn(...inputs: any[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * generateTicketCode — Generator ID Tiket 6 Karakter Alfanumerik
 * 
 * Mengubah ID peserta menjadi kode unik 6 karakter (huruf + angka).
 * Contoh output: "A3X7Q2", "NB5K1P", "Z9R4MJ"
 * 
 * Karakter yang DIGUNAKAN: A-Z (tanpa O, I) + 2-9 (tanpa 0, 1)
 * → Total 32 karakter bersih, tidak ada yang mirip/membingungkan
 * → 32^6 = 1.073.741.824 kemungkinan kombinasi
 * 
 * Format final di UI: NCC-A3X7Q2
 */
export const generateTicketCode = (id: number | string): string => {
  if (!id) return "AAAAAA";

  // Pool karakter: huruf + angka, tanpa karakter ambigu (O/0, I/1)
  const charPool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 karakter

  // Hitung seed awal dari ID
  let seed: number;
  const strId = String(id).trim();

  // Hanya jika tipe number murni atau string angka bulat
  if (typeof id === "number" || /^\d+$/.test(strId)) {
    const numId = typeof id === "number" ? id : parseInt(strId, 10);
    seed = (numId * 3512953 + 1234567) % 1073741824;
  } else {
    // ID string UUID / alfanumerik: hash djb2 yang dimodifikasi
    let hash = 5381;
    for (let i = 0; i < strId.length; i++) {
      hash = ((hash << 5) + hash) ^ strId.charCodeAt(i);
      hash = hash >>> 0; // pastikan unsigned 32-bit
    }
    seed = hash % 1073741824;
  }

  // Generate 6 karakter dengan pemetaan base-32 deterministik dari seed
  let result = "";
  let tempSeed = seed;
  for (let i = 0; i < 6; i++) {
    const idx = tempSeed % charPool.length;
    result += charPool[idx];
    tempSeed = Math.floor(tempSeed / charPool.length);
  }

  return result;
};
