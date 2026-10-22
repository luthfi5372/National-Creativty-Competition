import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function DashboardLoading() {
  return (
    <FullPageLoader 
      message="Menyiapkan Dasbor Peserta..." 
      subMessage="Menghubungkan akun, data registrasi, dan pengumuman terbaru"
    />
  );
}
