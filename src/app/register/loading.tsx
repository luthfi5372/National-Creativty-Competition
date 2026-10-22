import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function RegisterLoading() {
  return (
    <FullPageLoader 
      message="Menyiapkan Formulir Pendaftaran..." 
      subMessage="Memuat syarat dan ketentuan kompetisi NCC 13th"
    />
  );
}
