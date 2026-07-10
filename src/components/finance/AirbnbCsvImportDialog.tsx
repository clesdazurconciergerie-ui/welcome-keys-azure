import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isValid, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { BookingToComplete } from "@/hooks/useBookingsToComplete";

interface AirbnbCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingBookings: BookingToComplete[];
  onImported: () => void;
}

interface CsvRow {
  raw: Record<string, string>;
  checkIn: Date | null;
  checkOut: Date | null;
  guestName: string | null;
  gross: number | null;
  cleaning: number | null;
  commission: number | null;
  occupancyTax: number | null;
  matchedBookingId: string | null;
  matchedPropertyName: string | null;
  selected: boolean;
}

/** Parse a string like "1 234,56 €" / "$1,234.56" / "1234.56" → number. */
function parseAmount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[^\d.,-]/g, "")
    .replace(/\s/g, "");
  if (!cleaned) return null;
  // If both . and , present, assume , is decimal if it appears after .
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

/** Try multiple date formats common in Airbnb exports (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY). */
function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO
  const iso = parseISO(s);
  if (isValid(iso)) return iso;

  // dd/mm/yyyy or mm/dd/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    // Heuristic: if first part > 12, it's day; else assume dd/mm (FR default)
    const first = parseInt(a);
    const second = parseInt(b);
    let day: number, month: number;
    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else {
      // ambiguous → French default dd/mm
      day = first;
      month = second;
    }
    const d = new Date(year, month - 1, day);
    if (isValid(d)) return d;
  }
  return null;
}

/** Find the value of the first matching column key (case-insensitive, partial match). */
function pick(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const key = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return undefined;
}

export function AirbnbCsvImportDialog({
  open,
  onOpenChange,
  pendingBookings,
  onImported,
}: AirbnbCsvImportDialogProps) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRows([]);
    setFileName(null);
  }, []);

  const handleFile = (file: File) => {
    setParsing(true);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: CsvRow[] = (result.data as Record<string, string>[])
          .map((raw) => {
            const checkIn = parseDate(
              pick(raw, ["start date", "date d'arrivée", "arrivée", "check-in", "checkin"]),
            );
            const checkOut = parseDate(
              pick(raw, ["end date", "date de départ", "départ", "check-out", "checkout"]),
            );
            const guestName = pick(raw, ["guest", "voyageur", "nom"]) || null;

            const gross =
              parseAmount(pick(raw, ["gross earnings", "revenu brut", "amount", "montant"])) ??
              parseAmount(pick(raw, ["paid out", "payé"]));
            const cleaning = parseAmount(
              pick(raw, ["cleaning fee", "frais de ménage", "ménage"]),
            );
            const commission = parseAmount(
              pick(raw, ["service fee", "host fee", "commission", "frais de service"]),
            );
            const occupancyTax = parseAmount(
              pick(raw, ["occupancy tax", "taxe de séjour", "tourist tax"]),
            );

            // Match against a pending booking by checkIn/checkOut
            let matchedBookingId: string | null = null;
            let matchedPropertyName: string | null = null;
            if (checkIn && checkOut) {
              const ciMs = checkIn.getTime();
              const coMs = checkOut.getTime();
              const candidate = pendingBookings.find((b) => {
                const bCi = new Date(b.check_in).getTime();
                const bCo = new Date(b.check_out).getTime();
                return (
                  Math.abs(bCi - ciMs) <= 86400000 && Math.abs(bCo - coMs) <= 86400000
                );
              });
              if (candidate) {
                matchedBookingId = candidate.id;
                matchedPropertyName = candidate.property_name;
              }
            }

            return {
              raw,
              checkIn,
              checkOut,
              guestName,
              gross,
              cleaning,
              commission,
              occupancyTax,
              matchedBookingId,
              matchedPropertyName,
              selected: !!matchedBookingId && gross !== null,
            };
          })
          .filter((r) => r.checkIn && r.checkOut);

        setRows(parsed);
        setParsing(false);

        const matched = parsed.filter((r) => r.matchedBookingId).length;
        if (parsed.length === 0) {
          toast.error("Aucune ligne valide trouvée dans le CSV");
        } else {
          toast.success(`${parsed.length} ligne(s) lue(s), ${matched} match automatique(s)`);
        }
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setParsing(false);
        toast.error("Erreur lors de la lecture du fichier");
      },
    });
  };

  const stats = useMemo(() => {
    const matched = rows.filter((r) => r.matchedBookingId).length;
    const selected = rows.filter((r) => r.selected).length;
    const totalGross = rows
      .filter((r) => r.selected && r.gross)
      .reduce((sum, r) => sum + (r.gross ?? 0), 0);
    return { matched, selected, totalGross, total: rows.length };
  }, [rows]);

  const toggleRow = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)),
    );
  };

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.selected && r.matchedBookingId);
    if (toImport.length === 0) {
      toast.error("Aucune ligne sélectionnée");
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of toImport) {
      const gross = row.gross ?? 0;
      const cleaning = row.cleaning ?? 0;
      const commission = row.commission ?? 0;
      const tourist = row.occupancyTax ?? 0;
      const ownerNet = Math.round((gross - cleaning - commission - tourist) * 100) / 100;

      const { error } = await (supabase as any)
        .from("bookings")
        .update({
          gross_amount: gross,
          cleaning_amount: cleaning,
          commission_amount: commission,
          tourist_tax_amount: tourist,
          owner_net: ownerNet,
          financial_status: "completed",
          price_status: "completed",
        })
        .eq("id", row.matchedBookingId);

      if (error) {
        console.error("Update failed for booking", row.matchedBookingId, error);
        failed++;
      } else {
        success++;
      }
    }

    setImporting(false);
    if (success > 0) {
      toast.success(`${success} réservation(s) mise(s) à jour`);
      onImported();
      onOpenChange(false);
      reset();
    }
    if (failed > 0) toast.error(`${failed} échec(s)`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-black" />
            Importer un CSV Airbnb
          </DialogTitle>
          <DialogDescription>
            Téléchargez l'export "Transactions" depuis votre dashboard Airbnb (Menu → Transactions
            → Télécharger en CSV). Les montants seront automatiquement appliqués aux réservations
            correspondantes.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-border rounded-lg">
            {parsing ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Analyse du fichier…</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Glissez votre CSV Airbnb ici
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Ou cliquez pour parcourir vos fichiers
                </p>
                <input
                  type="file"
                  accept=".csv"
                  id="airbnb-csv-input"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("airbnb-csv-input")?.click()}
                >
                  Choisir un fichier
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 px-1 py-2 text-xs">
              <Badge variant="secondary">{stats.total} ligne(s)</Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {stats.matched} match(s)
              </Badge>
              {stats.total - stats.matched > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <AlertCircle className="w-3 h-3 mr-1" /> {stats.total - stats.matched} sans
                  correspondance
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground">
                Sélection : <strong>{stats.selected}</strong> ·{" "}
                <strong>{stats.totalGross.toFixed(2)} €</strong>
              </span>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2">Match</th>
                    <th className="px-2 py-2">Voyageur</th>
                    <th className="px-2 py-2">Séjour</th>
                    <th className="px-2 py-2 text-right">Brut</th>
                    <th className="px-2 py-2 text-right">Ménage</th>
                    <th className="px-2 py-2 text-right">Commission</th>
                    <th className="px-2 py-2 text-right">Taxe séjour</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const nights =
                      row.checkIn && row.checkOut
                        ? differenceInCalendarDays(row.checkOut, row.checkIn)
                        : 0;
                    return (
                      <tr
                        key={idx}
                        className={`border-t border-border/50 ${
                          row.matchedBookingId ? "" : "opacity-50"
                        }`}
                      >
                        <td className="px-2 py-2">
                          <Checkbox
                            checked={row.selected}
                            disabled={!row.matchedBookingId}
                            onCheckedChange={() => toggleRow(idx)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {row.matchedBookingId ? (
                            <span className="text-emerald-700 font-medium">
                              {row.matchedPropertyName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Aucun</span>
                          )}
                        </td>
                        <td className="px-2 py-2">{row.guestName || "—"}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {row.checkIn && format(row.checkIn, "d MMM", { locale: fr })}
                          {" → "}
                          {row.checkOut && format(row.checkOut, "d MMM", { locale: fr })}
                          <span className="ml-1 opacity-60">({nights}n)</span>
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {row.gross !== null ? `${row.gross.toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {row.cleaning !== null ? `${row.cleaning.toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {row.commission !== null ? `${row.commission.toFixed(2)} €` : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {row.occupancyTax !== null ? `${row.occupancyTax.toFixed(2)} €` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          {fileName && (
            <span className="text-xs text-muted-foreground mr-auto truncate max-w-[200px]">
              {fileName}
            </span>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </Button>
          {rows.length > 0 && (
            <Button variant="outline" onClick={reset} disabled={importing}>
              Choisir un autre fichier
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={importing || stats.selected === 0}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-white"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1.5" />
            )}
            Importer {stats.selected > 0 ? `(${stats.selected})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
