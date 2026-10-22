import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function LoginLoading() {
  return (
    <FullPageLoader 
      message="Menyiapkan Gerbang Masuk..." 
      subMessage="Memeriksa sesi dan keamanan portal NCC 13th"
    />
  );
}
