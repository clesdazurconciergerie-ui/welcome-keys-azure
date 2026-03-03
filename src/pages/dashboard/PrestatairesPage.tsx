import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wrench, Plus, Trash2, UserCheck, UserX, Loader2, Eye, EyeOff, Copy, Check, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useServiceProviders, type ServiceProviderFormData } from "@/hooks/useServiceProviders";
import { toast } from "sonner";

const PrestatairesPage = () => {
  const { providers, isLoading, createProvider, deleteProvider, toggleStatus } = useServiceProviders();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceProviderFormData>({
    first_name: '', last_name: '', email: '', password: '', phone: '', specialty: 'cleaning', notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Credentials confirmation state
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) return;
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setCreating(true);
    // Save credentials before creating (in case form resets)
    const creds = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
    };
    const result = await createProvider(formData);
    setCreating(false);
    if (result) {
      setCreateOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', password: '', phone: '', specialty: 'cleaning', notes: '' });
      // Show credentials confirmation
      setCreatedCredentials(creds);
      setCredentialsDialog(true);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copié !");
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prestataires</h1>
            <p className="text-muted-foreground mt-1">Gérez vos prestataires ménage et maintenance</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un prestataire
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau prestataire</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prénom *</Label>
                    <Input value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="prestataire@email.com" />
                </div>
                <div>
                  <Label>Mot de passe * <span className="text-xs text-muted-foreground">(min. 6 caractères)</span></Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={formData.password} 
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mot de passe du prestataire"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ce mot de passe sera utilisé par le prestataire pour se connecter sur la page /auth
                  </p>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Spécialité</Label>
                  <Select value={formData.specialty} onValueChange={v => setFormData(p => ({ ...p, specialty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Ménage</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="both">Les deux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Créer le compte
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Credentials confirmation dialog */}
      <Dialog open={credentialsDialog} onOpenChange={setCredentialsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Compte créé avec succès
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Transmettez ces identifiants au prestataire <strong>{createdCredentials.name}</strong> pour qu'il puisse se connecter :
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-mono text-sm font-medium">{createdCredentials.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdCredentials.email, 'email')}>
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mot de passe</p>
                    <p className="font-mono text-sm font-medium">{createdCredentials.password}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdCredentials.password, 'password')}>
                    {copiedField === 'password' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ Le prestataire doit se connecter sur <strong>{window.location.origin}/auth</strong> avec ces identifiants. Il sera automatiquement redirigé vers son espace.
                </p>
              </div>

              <Button onClick={() => {
                const text = `Identifiants MyWelkom :\nEmail : ${createdCredentials.email}\nMot de passe : ${createdCredentials.password}\nConnexion : ${window.location.origin}/auth`;
                copyToClipboard(text, 'all');
              }} variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                {copiedField === 'all' ? 'Copié !' : 'Copier tout (email + mot de passe + lien)'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : providers.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun prestataire</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ajoutez vos prestataires ménage pour leur permettre d'uploader les photos d'intervention.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map(sp => (
            <Card key={sp.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {sp.first_name[0]}{sp.last_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{sp.first_name} {sp.last_name}</p>
                    <p className="text-sm text-muted-foreground">{sp.email}</p>
                    {sp.phone && <p className="text-xs text-muted-foreground">{sp.phone}</p>}
                  </div>
                  <Badge variant={sp.status === 'active' ? 'default' : 'secondary'}>
                    {sp.status === 'active' ? 'Actif' : sp.status === 'disabled' ? 'Désactivé' : 'En attente'}
                  </Badge>
                  <Badge variant="outline">
                    {sp.specialty === 'cleaning' ? '🧹 Ménage' : sp.specialty === 'maintenance' ? '🔧 Maintenance' : '🧹🔧 Polyvalent'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleStatus(sp.id, sp.status)}>
                    {sp.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer {sp.first_name} {sp.last_name} ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera définitivement le compte, les photos et l'historique des interventions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProvider(sp.id)} className="bg-destructive text-destructive-foreground">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrestatairesPage;
