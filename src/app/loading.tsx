import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function RootLoading() {
  return (
    <FullPageLoader 
      message="Memuat National Creativity Competition..." 
      subMessage="Mohon tunggu sebentar, data sedang dipersiapkan"
    />
  );
}
