import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function AdminLoading() {
  return (
    <FullPageLoader 
      message="Memuat Panel Administrator..." 
      subMessage="Mengunduh data dan konfigurasi sistem"
    />
  );
}
