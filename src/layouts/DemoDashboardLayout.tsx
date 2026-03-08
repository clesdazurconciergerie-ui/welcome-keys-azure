import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { DemoTourPanel } from "@/components/demo/DemoTourPanel";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoProvider } from "@/contexts/DemoContext";
import { Menu } from "lucide-react";

export default function DemoDashboardLayout() {
  return (
    <DemoProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DemoSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar — same as real dashboard */}
            <header className="h-14 flex items-center gap-3 border-b border-border bg-card px-4 sticky top-0 z-40">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex-1" />
              <DemoBanner />
            </header>
            <main className="flex-1 p-5 md:p-8 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <DemoTourPanel />
      </SidebarProvider>
    </DemoProvider>
  );
}
