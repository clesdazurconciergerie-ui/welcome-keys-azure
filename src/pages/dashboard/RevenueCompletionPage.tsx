import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Coins, Search, Sparkles, CheckCircle2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { useBookingsToComplete, type BookingToComplete } from "@/hooks/useBookingsToComplete";
import { BookingRevenueDialog } from "@/components/finance/BookingRevenueDialog";
import { AirbnbCsvImportDialog } from "@/components/finance/AirbnbCsvImportDialog";
import { PlatformBadge } from "@/components/PlatformBadge";
import { resolveBookingPlatform } from "@/lib/booking-platforms";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function RevenueCompletionPage() {
  const { bookings, loading, refetch, runBackfill } = useBookingsToComplete();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BookingToComplete | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) =>
        b.property_name.toLowerCase().includes(q) ||
        (b.guest_name?.toLowerCase().includes(q) ?? false),
    );
  }, [bookings, search]);

  const handleBackfill = async () => {
    setBackfilling(true);
    const count = await runBackfill();
    setBackfilling(false);
    toast.success(`${count} réservation(s) synchronisée(s) depuis vos calendriers iCal`);
    await refetch();
  };

  const openDialog = (b: BookingToComplete) => {
    setSelected(b);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Coins className="w-6 h-6 text-black" />
            Revenus à compléter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saisissez les montants des réservations importées depuis vos calendriers iCal pour calculer occupation, revenu net et performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Importer CSV Airbnb
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfilling}
          >
            {backfilling ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            Synchroniser iCal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              {filtered.length} réservation{filtered.length > 1 ? "s" : ""} en attente
              {filtered.length === 0 && !loading && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher logement / voyageur"
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600/40 mb-3" />
              <p className="text-sm font-medium text-foreground">Tout est à jour !</p>
              <p className="text-xs text-muted-foreground mt-1">
                Toutes vos réservations ont des montants renseignés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 font-semibold">Logement</th>
                    <th className="pb-3 font-semibold">Voyageur</th>
                    <th className="pb-3 font-semibold">Plateforme</th>
                    <th className="pb-3 font-semibold">Séjour</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const platform = resolveBookingPlatform({
                      platform: b.source_platform,
                      source: b.source,
                    });
                    const nights = Math.max(
                      1,
                      Math.round(
                        (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) /
                          86400000,
                      ),
                    );
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 font-medium text-foreground">{b.property_name}</td>
                        <td className="py-3 text-muted-foreground">
                          {b.guest_name || <span className="italic text-xs">Anonyme</span>}
                        </td>
                        <td className="py-3">
                          <PlatformBadge platform={platform} />
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {format(new Date(b.check_in), "d MMM", { locale: fr })}
                          {" → "}
                          {format(new Date(b.check_out), "d MMM yyyy", { locale: fr })}
                          <span className="ml-2 opacity-70">({nights}n)</span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(b)}
                            className="gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-black" />
                            Compléter
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingRevenueDialog
        booking={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={refetch}
      />

      <AirbnbCsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        pendingBookings={bookings}
        onImported={refetch}
      />
    </div>
  );
}
