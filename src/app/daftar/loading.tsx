import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function DaftarLoading() {
  return (
    <FullPageLoader 
      message="Menyiapkan Formulir Pendaftaran..." 
      subMessage="Memuat formulir pendaftaran kompetisi NCC 13th"
    />
  );
}
