import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function JuriLoading() {
  return (
    <FullPageLoader 
      message="Menyiapkan Portal Dewan Juri..." 
      subMessage="Memuat berkas peserta dan rubrik penilaian"
    />
  );
}
