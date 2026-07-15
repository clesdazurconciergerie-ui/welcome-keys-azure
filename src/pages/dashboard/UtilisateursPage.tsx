import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save, ShieldCheck } from 'lucide-react';

const SECTIONS: { key: string; label: string; group: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', group: 'Pilotage' },
  { key: 'cockpit', label: 'Cockpit Stratégique', group: 'Pilotage' },
  { key: 'ical-monitoring', label: 'Monitoring iCal', group: 'Pilotage' },
  { key: 'logements', label: 'Biens / Logements', group: 'Logements' },
  { key: 'welkom-studio', label: 'Welkom Studio', group: 'Logements' },
  { key: 'proprietaires', label: 'Propriétaires', group: 'Logements' },
  { key: 'prestataires', label: 'Prestataires', group: 'Logements' },
  { key: 'missions', label: 'Missions', group: 'Logements' },
  { key: 'etats-des-lieux-v2', label: 'États des lieux', group: 'Logements' },
  { key: 'voyageurs', label: 'Voyageurs', group: 'Logements' },
  { key: 'messages', label: 'Messages auto', group: 'Logements' },
  { key: 'livrets', label: 'Livrets', group: 'Logements' },
  { key: 'prospection', label: 'Prospection', group: 'Commercial' },
  { key: 'demandes-proprietaires', label: 'Demandes propriétaires', group: 'Commercial' },
  { key: 'call-prompter', label: 'Call Prompter', group: 'Commercial' },
  { key: 'tarification', label: 'Tarification dynamique', group: 'Revenue' },
  { key: 'channel-manager', label: 'Channel Manager', group: 'Revenue' },
  { key: 'conflits', label: 'Conflits réservations', group: 'Revenue' },
  { key: 'smart-keys', label: 'Smart Keys', group: 'Revenue' },
  { key: 'finance', label: 'Finance', group: 'Finance' },
  { key: 'taxe-sejour', label: 'Taxe de séjour', group: 'Finance' },
  { key: 'parametres', label: 'Paramètres', group: 'Paramètres' },
  { key: 'automatisation', label: 'Automatisation', group: 'Paramètres' },
  { key: 'branding', label: 'Apparence', group: 'Paramètres' },
];

type ManagedUser = {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  sections?: Record<string, any>;
};

type PermMap = Record<string, { r?: boolean; c?: boolean; u?: boolean; d?: boolean }>;

export default function UtilisateursPage() {
  const { hasRole, isLoading: rolesLoading } = useUserRoles();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'team_member' as const });
  const [formPerms, setFormPerms] = useState<PermMap>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<PermMap>({});

  const isSuper = hasRole('super_admin');

  useEffect(() => { if (!rolesLoading && isSuper) load(); else if (!rolesLoading) setLoading(false); }, [rolesLoading, isSuper]);

  async function load() {
    setLoading(true);
    // Users + roles + permissions
    const [{ data: uRows }, { data: roleRows }, { data: permRows }] = await Promise.all([
      supabase.from('users').select('id, email').limit(500),
      supabase.from('user_roles' as any).select('user_id, role') as any,
      supabase.from('team_permissions' as any).select('user_id, sections') as any,
    ]);
    const permsByUser: Record<string, any> = {};
    (permRows || []).forEach((p: any) => { permsByUser[p.user_id] = p.sections; });
    const rolesByUser: Record<string, string> = {};
    (roleRows || []).forEach((r: any) => {
      // primary role priority: super_admin > team_member > others
      const priority: Record<string, number> = { super_admin: 100, team_member: 90, service_provider: 80, owner: 70 };
      if (!rolesByUser[r.user_id] || (priority[r.role] || 0) > (priority[rolesByUser[r.user_id]] || 0)) {
        rolesByUser[r.user_id] = r.role;
      }
    });
    const list: ManagedUser[] = (uRows || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      role: rolesByUser[u.id] || '—',
      sections: permsByUser[u.id],
    }));
    setUsers(list);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-team-account', {
        body: {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          sections: form.role === 'team_member' ? formPerms : undefined,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Compte créé');
      setForm({ first_name: '', last_name: '', email: '', password: '', role: 'team_member' });
      setFormPerms({});
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  }

  async function savePerms(userId: string) {
    const { error } = await supabase.from('team_permissions' as any).upsert({
      user_id: userId,
      sections: editPerms,
    }, { onConflict: 'user_id' });
    if (error) { toast.error(error.message); return; }
    toast.success('Permissions enregistrées');
    setEditing(null);
    load();
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Supprimer définitivement ${email} ?`)) return;
    // Delete team_permissions + user_roles + users row (auth.users cascade only if trigger — we call admin edge fn separately in future).
    // For now: remove role + permissions to disable access; auth user deletion needs admin API.
    await supabase.from('team_permissions' as any).delete().eq('user_id', userId);
    await supabase.from('user_roles' as any).delete().eq('user_id', userId);
    toast.success('Accès révoqué (compte auth conservé, à supprimer manuellement)');
    load();
  }

  if (rolesLoading || loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!isSuper) {
    return <div className="p-8 text-center text-muted-foreground">Réservé au super-administrateur.</div>;
  }

  const grouped = SECTIONS.reduce((acc, s) => {
    (acc[s.group] = acc[s.group] || []).push(s);
    return acc;
  }, {} as Record<string, typeof SECTIONS>);

  const PermGrid = ({ perms, onChange }: { perms: PermMap; onChange: (p: PermMap) => void }) => (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">{group}</div>
          <div className="rounded border">
            <div className="grid grid-cols-[1fr_repeat(4,60px)] items-center px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              <div>Section</div><div className="text-center">Voir</div><div className="text-center">Créer</div><div className="text-center">Modifier</div><div className="text-center">Suppr.</div>
            </div>
            {items.map(s => (
              <div key={s.key} className="grid grid-cols-[1fr_repeat(4,60px)] items-center px-3 py-1.5 text-sm border-b last:border-0">
                <div>{s.label}</div>
                {(['r','c','u','d'] as const).map(a => (
                  <div key={a} className="flex justify-center">
                    <Checkbox
                      checked={!!perms[s.key]?.[a]}
                      onCheckedChange={(v) => {
                        const next = { ...perms };
                        next[s.key] = { ...next[s.key], [a]: !!v };
                        // If read is off, disable others visually — keep data but user should uncheck manually
                        onChange(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Gestion des utilisateurs</h1>
        <p className="text-sm text-muted-foreground mt-1">Créer et gérer les comptes prestataires, propriétaires et membres d'équipe.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Nouveau compte</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Prénom</Label><Input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
              <div><Label>Nom</Label><Input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Mot de passe</Label><Input type="text" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              <div>
                <Label>Type de compte</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({...form, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_member">Membre d'équipe (accès dashboard)</SelectItem>
                    <SelectItem value="service_provider">Prestataire</SelectItem>
                    <SelectItem value="owner">Propriétaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.role === 'team_member' && (
              <div>
                <Label className="mb-2 block">Permissions par section</Label>
                <PermGrid perms={formPerms} onChange={setFormPerms} />
              </div>
            )}

            <Button type="submit" disabled={creating} className="bg-black hover:bg-black/85 text-white">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer le compte'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comptes existants ({users.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="border rounded p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-sm">{u.email}</div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {u.role === 'team_member' && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditing(editing === u.id ? null : u.id);
                      setEditPerms((u.sections as PermMap) || {});
                    }}>
                      {editing === u.id ? 'Fermer' : 'Permissions'}
                    </Button>
                  )}
                  {u.role !== 'super_admin' && (
                    <Button size="sm" variant="ghost" onClick={() => deleteUser(u.id, u.email)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {editing === u.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <PermGrid perms={editPerms} onChange={setEditPerms} />
                  <Button size="sm" onClick={() => savePerms(u.id)} className="bg-black hover:bg-black/85 text-white">
                    <Save className="w-4 h-4 mr-2" />Enregistrer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
