import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Menu } from "lucide-react";
import { useIsOwner } from "@/hooks/useIsOwner";
import { PortalTourProvider } from "@/components/onboarding/PortalTourProvider";

export default function OwnerDashboardLayout() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const { isOwner, isLoading: ownerLoading } = useIsOwner();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserEmail(session.user.email || "");
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && !ownerLoading && !isOwner) navigate("/dashboard");
  }, [authLoading, ownerLoading, isOwner, navigate]);

  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card px-4 sticky top-0 z-40">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground font-medium">{userEmail}</span>
          </header>
          <main className="flex-1 p-4 sm:p-5 md:p-8 overflow-auto pb-24 sm:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
