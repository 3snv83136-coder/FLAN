import { AppSidebar } from "@/components/layout/app-sidebar";
import { VoiceFab } from "@/components/layout/voice-fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <VoiceFab />
      </div>
    </div>
  );
}
