import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ServiceProviderSidebar } from "@/components/service-provider/ServiceProviderSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Menu } from "lucide-react";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";

export default function ServiceProviderDashboardLayout() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const { isServiceProvider, isLoading: spLoading } = useIsServiceProvider();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email || "");
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && !spLoading && !isServiceProvider) {
      navigate("/dashboard");
    }
  }, [authLoading, spLoading, isServiceProvider, navigate]);

  if (authLoading || spLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F7F9FC]">
        <ServiceProviderSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-white px-4 sticky top-0 z-40">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">{userEmail}</span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
