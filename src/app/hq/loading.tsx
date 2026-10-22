import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function HqLoading() {
  return (
    <FullPageLoader 
      message="Memuat Command Center NCC..." 
      subMessage="Mengunduh data pendaftar, analitik, dan pengaturan sistem"
    />
  );
}
