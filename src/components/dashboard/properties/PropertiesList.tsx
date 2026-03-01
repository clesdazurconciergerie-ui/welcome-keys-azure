import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Property } from "@/hooks/useProperties";

interface Props {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onView: (id: string) => void;
}

export function PropertiesList({ properties, onView }: Props) {
  const [search, setSearch] = useState("");
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});

  // Fetch main photos and owners for all properties
  useEffect(() => {
    if (!properties.length) return;
    const ids = properties.map(p => p.id);

    // Fetch first photo per property
    (supabase as any)
      .from("property_photos")
      .select("property_id, url, is_main, order_index")
      .in("property_id", ids)
      .order("is_main", { ascending: false })
      .order("order_index", { ascending: true })
      .then(({ data }: any) => {
        const map: Record<string, string> = {};
        (data || []).forEach((p: any) => {
          if (!map[p.property_id]) map[p.property_id] = p.url;
        });
        setPhotoMap(map);
      });

    // Fetch owners via owner_properties join
    (supabase as any)
      .from("owner_properties")
      .select("property_id, owner_id")
      .in("property_id", ids)
      .then(async ({ data }: any) => {
        if (!data?.length) return;
        const ownerIds = [...new Set(data.map((r: any) => r.owner_id))] as string[];
        const propOwnerMap: Record<string, string[]> = {};
        data.forEach((r: any) => {
          if (!propOwnerMap[r.property_id]) propOwnerMap[r.property_id] = [];
          propOwnerMap[r.property_id].push(r.owner_id);
        });

        const { data: owners } = await (supabase as any)
          .from("owners")
          .select("id, first_name, last_name")
          .in("id", ownerIds);

        const ownerNames: Record<string, string> = {};
        (owners || []).forEach((o: any) => {
          ownerNames[o.id] = `${o.first_name} ${o.last_name}`;
        });

        const map: Record<string, string> = {};
        Object.entries(propOwnerMap).forEach(([propId, oIds]) => {
          map[propId] = (oIds as string[]).map(oid => ownerNames[oid] || "").filter(Boolean).join(", ");
        });
        setOwnerMap(map);
      });
  }, [properties]);

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un bien…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          {search ? "Aucun résultat" : "Aucun bien enregistré"}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(prop => (
            <div
              key={prop.id}
              onClick={() => onView(prop.id)}
              className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {photoMap[prop.id] ? (
                  <img
                    src={photoMap[prop.id]}
                    alt={prop.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-base truncate">{prop.name}</h3>
                {ownerMap[prop.id] ? (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{ownerMap[prop.id]}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Aucun propriétaire</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
