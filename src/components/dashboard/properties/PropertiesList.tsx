import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreVertical, MapPin, Bed, Users as UsersIcon, Edit, Trash2, Euro, Copy, Eye } from "lucide-react";
import type { Property } from "@/hooks/useProperties";

interface Props {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onView: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", villa: "Villa",
  studio: "Studio", loft: "Loft", chalet: "Chalet", other: "Autre",
};

const typeOptions = [
  { value: "all", label: "Tous les types" },
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "loft", label: "Loft" },
  { value: "chalet", label: "Chalet" },
  { value: "other", label: "Autre" },
];

export function PropertiesList({ properties, onEdit, onDelete, onDuplicate, onView }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || p.property_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, adresse, ville…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          {search || typeFilter !== "all" ? "Aucun résultat pour ces critères" : "Aucun bien enregistré"}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(prop => (
            <Card key={prop.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => onView(prop.id)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{prop.name}</h3>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {typeLabels[prop.property_type || "apartment"] || prop.property_type}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onView(prop.id)}>
                        <Eye className="h-4 w-4 mr-2" /> Voir la fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(prop)}>
                        <Edit className="h-4 w-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(prop.id)}>
                        <Copy className="h-4 w-4 mr-2" /> Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(prop.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{prop.address}{prop.city ? `, ${prop.city}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {prop.capacity && (
                      <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{prop.capacity} pers.</span>
                    )}
                    {prop.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{prop.bedrooms} ch.</span>
                    )}
                    {prop.surface_m2 && <span>{prop.surface_m2} m²</span>}
                  </div>
                  {prop.avg_nightly_rate && (
                    <div className="flex items-center gap-1 text-foreground font-medium">
                      <Euro className="h-3 w-3" />{prop.avg_nightly_rate}€ / nuit
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le livret d'accueil associé sera détaché mais conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
