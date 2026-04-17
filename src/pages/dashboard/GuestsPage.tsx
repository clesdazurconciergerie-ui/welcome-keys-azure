import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGuests } from '@/hooks/useGuests';
import { Users, Mail, Phone, MapPin, Download, Search, Shield, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function GuestsPage() {
  const { guests, isLoading, deleteGuest, exportCsv } = useGuests();
  const [search, setSearch] = useState('');
  const [filterConsent, setFilterConsent] = useState(false);

  const filtered = guests.filter(g => {
    if (filterConsent && !g.marketing_consent) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.full_name?.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.phone?.toLowerCase().includes(q) ||
      g.city?.toLowerCase().includes(q) ||
      g.property?.name?.toLowerCase().includes(q)
    );
  });

  const consentCount = guests.filter(g => g.marketing_consent).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Voyageurs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{guests.length} voyageur(s) · {consentCount} avec consentement marketing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(false)} disabled={guests.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />Tout exporter
          </Button>
          <Button size="sm" onClick={() => exportCsv(true)} disabled={consentCount === 0}>
            <Shield className="w-4 h-4 mr-1.5" />Marketing ({consentCount})
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, email, ville, bien)…" className="pl-9" />
        </div>
        <Button
          variant={filterConsent ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterConsent(!filterConsent)}
          className="shrink-0"
        >
          <Shield className="w-4 h-4 mr-1.5" />
          Marketing uniquement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Aucun voyageur</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Les voyageurs apparaîtront ici dès qu'un état des lieux d'entrée est validé avec leurs coordonnées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((g, idx) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="font-semibold truncate">{g.full_name || 'Voyageur sans nom'}</h3>
                        {g.marketing_consent && (
                          <Badge variant="default" className="text-xs gap-1"><Shield className="w-3 h-3" />Marketing</Badge>
                        )}
                        {g.property?.name && <Badge variant="outline" className="text-xs">{g.property.name}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {g.email && <span className="flex items-center gap-1 min-w-0"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{g.email}</span></span>}
                        {g.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phone}</span>}
                        {(g.city || g.country) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[g.city, g.country].filter(Boolean).join(', ')}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Ajouté le {new Date(g.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce voyageur ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Les données RGPD de "{g.full_name || g.email}" seront supprimées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteGuest(g.id)} className="bg-destructive hover:bg-destructive/90">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
