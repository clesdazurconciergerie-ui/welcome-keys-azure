import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileText, Home, LogOut, LineChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import "./rapports-theme.css";

const nav = [
  { to: "/rapports", end: true, label: "Rapports", icon: FileText },
  { to: "/rapports/estimation/nouveau", end: false, label: "Estimation", icon: LineChart },
  { to: "/rapports/logements", end: false, label: "Logements", icon: Home },
];

export default function RapportsLayout() {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion");
    navigate("/");
  };

  return (
    <div className="azurkeys-scope min-h-screen bg-[hsl(var(--az-bg))] text-[hsl(var(--az-ink))]">
      <header className="border-b border-[hsl(var(--az-line))] bg-[hsl(var(--az-bg))]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/rapports" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--az-ink))] text-[hsl(var(--az-sand))] flex items-center justify-center font-display text-lg font-semibold tracking-wider">
              A
            </div>
            <div className="leading-tight">
              <div className="font-display text-[22px] font-semibold tracking-wide">Azurkeys</div>
              <div className="font-body text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--az-muted))]">
                Report · Clés d'Azur
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-full text-[13px] font-body font-medium tracking-wide transition-all flex items-center gap-2",
                    isActive
                      ? "bg-[hsl(var(--az-ink))] text-[hsl(var(--az-sand))]"
                      : "text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))] hover:bg-[hsl(var(--az-sand))]"
                  )
                }
              >
                <item.icon className="w-4 h-4" strokeWidth={1.6} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={signOut}
              className="ml-2 p-2 rounded-full text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))] hover:bg-[hsl(var(--az-sand))] transition-colors"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-[hsl(var(--az-line))] mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center font-body text-[11px] uppercase tracking-[0.28em] text-[hsl(var(--az-muted))]">
          Azurkeys Report · Conciergerie premium · Côte d'Azur
        </div>
      </footer>
    </div>
  );
}
