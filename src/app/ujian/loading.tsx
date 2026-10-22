import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function UjianLoading() {
  return (
    <FullPageLoader 
      message="Menghubungkan ke Ruang Ujian CBT..." 
      subMessage="Memverifikasi integritas sesi dan sinkronisasi soal"
    />
  );
}
