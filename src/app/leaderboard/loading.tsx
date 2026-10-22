import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function LeaderboardLoading() {
  return (
    <FullPageLoader 
      message="Memuat Papan Peringkat Resmi..." 
      subMessage="Mengambil klasemen peserta dan status kelulusan babak"
    />
  );
}
