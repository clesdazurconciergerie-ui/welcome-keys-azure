import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";
import { Loader2, Menu } from "lucide-react";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const { isOwner, isLoading: ownerLoading } = useIsOwner();
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

  // If user is an owner created by concierge, redirect to owner space
  useEffect(() => {
    if (!authLoading && !ownerLoading && isOwner) {
      navigate("/proprietaire");
    }
  }, [authLoading, ownerLoading, isOwner, navigate]);

  // If user is a service provider, redirect to SP space
  useEffect(() => {
    if (!authLoading && !spLoading && isServiceProvider) {
      navigate("/prestataire");
    }
  }, [authLoading, spLoading, isServiceProvider, navigate]);

  if (authLoading || ownerLoading || spLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F7F9FC]">
        <DashboardSidebar />
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
