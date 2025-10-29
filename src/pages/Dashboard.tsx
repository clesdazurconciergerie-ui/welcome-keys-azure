import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  LogOut, 
  Edit, 
  Eye, 
  Copy, 
  Trash2,
  FileText,
  Loader2,
  QrCode,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import { useUserRoles } from "@/hooks/useUserRoles";
import SubscriptionSection from "@/components/dashboard/SubscriptionSection";
import DemoExpirationBanner from "@/components/DemoExpirationBanner";
import SubscriptionAlert from "@/components/SubscriptionAlert";

interface Pin {
  pin_code: string;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [booklets, setBooklets] = useState<any[]>([]);
  const [pins, setPins] = useState<Record<string, Pin>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [canCreateBooklet, setCanCreateBooklet] = useState(true);
  const [quotaMessage, setQuotaMessage] = useState("");
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  
  // Utiliser le hook sécurisé pour les rôles
  const { primaryRole: userRole, hasRole, isLoading: rolesLoading } = useUserRoles();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
    };
    init();
  }, []);

  useEffect(() => {
    if (!rolesLoading && userRole && subscriptionStatus) {
      fetchBooklets();
      checkExpiredDemo();
    }
  }, [userRole, subscriptionStatus, rolesLoading]);

  const checkExpiredDemo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('role, demo_token_expires_at')
      .eq('id', user.id)
      .single();

    if (userData?.role === 'demo_user' && userData.demo_token_expires_at) {
      const expiresAt = new Date(userData.demo_token_expires_at);
      const now = new Date();
      if (now >= expiresAt) {
        navigate('/expired-demo');
      }
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const email = session.user.email || "";
    setUserEmail(email);
    
    // Extract first name from email
    const name = email.split('@')[0].split('.')[0];
    setUserName(name.charAt(0).toUpperCase() + name.slice(1));

    // Fetch user subscription status and trial info
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_status, trial_expires_at, demo_token_expires_at')
      .eq('id', session.user.id)
      .single();

    if (userData) {
      setSubscriptionStatus(userData.subscription_status || 'none');
      setTrialExpiresAt(userData.trial_expires_at);
      setDemoExpiresAt(userData.demo_token_expires_at);
    }
  };

  const fetchBooklets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expirée");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("booklets")
        .select("*")
        .eq("user_id", user.id) // Explicit owner filter - defense in depth
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setBooklets(data || []);

      // Check quota
      const bookletCount = data?.length || 0;
      const status = subscriptionStatus || 'none';

      let canCreate = true;
      let message = '';
      
      // Calculer les jours restants après avoir récupéré les données
      if (userRole === 'free_trial' && trialExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(trialExpiresAt);
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays > 0 ? diffDays : 0);
      }
      
      if (userRole === 'demo_user' && demoExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(demoExpiresAt);
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays > 0 ? diffDays : 0);
      }

      if (userRole === 'free_trial') {
        // Vérifier si l'essai est expiré
        if (trialExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(trialExpiresAt);
          
          if (now >= expiresAt) {
            canCreate = false;
            message = "Votre essai gratuit est terminé. Souscrivez un abonnement pour continuer.";
          } else if (bookletCount >= 1) {
            canCreate = false;
            message = "Vous avez créé votre livret d'essai. Souscrivez un abonnement pour créer plus de livrets.";
          }
        }
      } else if (userRole === 'demo_user') {
        // Vérifier si la démo est expirée
        if (demoExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(demoExpiresAt);
          
          if (now >= expiresAt) {
            canCreate = false;
            message = "Votre essai gratuit est terminé. Vos données ont été supprimées. Souscrivez un abonnement pour continuer.";
          } else if (bookletCount >= 1) {
            canCreate = false;
            message = "Vous avez créé votre livret de démo. Souscrivez un abonnement pour créer plus de livrets.";
          }
        }
      } else if (userRole === 'super_admin') {
        // Super admin: pas de limite
        canCreate = true;
      } else if (status !== 'active' || userRole === 'free') {
        canCreate = false;
        message = "Abonnez-vous au plan Starter pour créer votre premier livret.";
      } else if (userRole === 'pack_starter' && bookletCount >= 1) {
        canCreate = false;
        message = "Vous avez atteint votre quota (1/1 livret). Passez au plan Pro pour créer plus de livrets.";
      } else if (userRole === 'pack_pro' && bookletCount >= 5) {
        canCreate = false;
        message = "Vous avez atteint votre quota (5/5 livrets). Passez au plan Business pour créer plus de livrets.";
      } else if (userRole === 'pack_business' && bookletCount >= 15) {
        canCreate = false;
        message = "Vous avez atteint votre quota (15/15 livrets). Passez au plan Premium pour des livrets illimités.";
      }

      setCanCreateBooklet(canCreate);
      setQuotaMessage(message);

      // Fetch PINs for published booklets
      const publishedIds = data?.filter(b => b.status === 'published').map(b => b.id) || [];
      if (publishedIds.length > 0) {
        const { data: pinsData } = await supabase
          .from("pins")
          .select("booklet_id, pin_code, status")
          .in("booklet_id", publishedIds)
          .eq("status", "active");

        if (pinsData) {
          const pinsMap: Record<string, Pin> = {};
          pinsData.forEach(pin => {
            pinsMap[pin.booklet_id] = pin;
          });
          setPins(pinsMap);
        }
      }
    } catch (error) {
      console.error("Error fetching booklets:", error);
      toast.error("Erreur lors du chargement des livrets");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livret ?")) return;

    try {
      const { error } = await supabase
        .from("booklets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Livret supprimé");
      fetchBooklets();
    } catch (error) {
      console.error("Error deleting booklet:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDuplicate = async (booklet: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const newBooklet = {
        property_name: booklet.property_name ? `${booklet.property_name} (copie)` : `${booklet.title || 'Livret'} (copie)`,
        property_address: booklet.property_address || "",
        user_id: user.id,
      };

      const { error } = await supabase
        .from("booklets")
        .insert([newBooklet]);

      if (error) throw error;
      toast.success("Livret dupliqué");
      fetchBooklets();
    } catch (error) {
      console.error("Error duplicating booklet:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handlePreview = (id: string) => {
    window.open(`/preview/${id}`, '_blank');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/view/${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  const handleGenerateQR = async (code: string, propertyName: string) => {
    try {
      const link = `${window.location.origin}/view/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
      
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${propertyName.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("QR Code téléchargé !");
    } catch (error) {
      console.error("Error generating QR:", error);
      toast.error("Erreur lors de la génération du QR code");
    }
  };

  const handleRegeneratePin = async (bookletId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir régénérer le code PIN ? L'ancien code sera désactivé.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée");
        return;
      }

      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/regenerate-pin/${bookletId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la régénération');
      }

      const data = await response.json();
      toast.success(`Nouveau code généré : ${data.pin_code}`);
      fetchBooklets();
    } catch (error) {
      console.error("Error regenerating PIN:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la régénération du code");
    }
  };

  const handleCreateBooklet = () => {
    if (!canCreateBooklet) {
      // Si l'essai est expiré ou si pas d'abonnement, rediriger vers /tarifs
      if (userRole === 'free_trial' || userRole === 'demo_user' || !userRole || subscriptionStatus !== 'active') {
        navigate('/tarifs');
        return;
      }
      
      toast.error(quotaMessage);
      return;
    }
    navigate("/booklets/new");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#F7F9FC]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FC 100%)'
      }}
    >
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border-b border-[#EDEFF3] sticky top-0 z-50"
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <BrandMark variant="compact" />
              <p className="text-xs text-[#707070] ml-10">{userEmail}</p>
            </div>
            <Button 
              onClick={handleSignOut}
              className="bg-primary hover:bg-[#122372] text-white rounded-lg transition-all duration-300 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <p className="text-[#6C6C6C] text-lg font-light italic">
            Bonjour {userName} 👋 — Gérez vos livrets d'accueil avec élégance.
          </p>
        </motion.div>

        {/* Subscription Section */}
        <SubscriptionSection />

        {/* Subscription Alerts (payment failures, expirations) */}
        <SubscriptionAlert />

        {/* Demo Expiration Banner */}
        <DemoExpirationBanner />

        {/* Free Trial Banner */}
        {userRole === 'free_trial' && daysRemaining !== null && daysRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Essai gratuit actif
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Il vous reste <span className="font-semibold text-foreground">{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</span> pour tester Welkom et créer votre premier livret d'accueil.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate('/tarifs')}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      Découvrir les plans
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}


        {/* Quota Banner */}
        {!canCreateBooklet && quotaMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-foreground mb-2">{quotaMessage}</p>
                    <Button
                      size="sm"
                      onClick={() => navigate('/tarifs')}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      Voir les tarifs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Page Title & CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12"
        >
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary mb-3">
              Mes livrets d'accueil
            </h2>
            <p className="text-lg text-[#6C6C6C]">
              Créez et gérez vos livrets numériques
            </p>
          </div>
          <Button 
            onClick={handleCreateBooklet}
            size="lg"
            disabled={!canCreateBooklet}
            className="bg-primary hover:bg-[#122372] text-white rounded-xl px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau livret
          </Button>
        </motion.div>

        {/* Booklets Grid or Empty State */}
        {booklets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card 
              className="text-center py-16 border border-[#EEF0F5] bg-white"
              style={{
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}
            >
              <CardContent className="pt-6">
                <FileText className="w-20 h-20 mx-auto mb-6 text-[#6C6C6C] opacity-40" />
                <h3 className="font-display text-2xl font-semibold text-primary mb-3">
                  Aucun livret pour le moment
                </h3>
                <p className="text-[#707070] mb-8 text-lg">
                  Créez votre premier livret d'accueil pour commencer
                </p>
                <Button 
                  onClick={handleCreateBooklet}
                  size="lg"
                  disabled={!canCreateBooklet}
                  className="bg-primary hover:bg-[#122372] text-white rounded-xl px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Créer mon premier livret
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {booklets.map((booklet, index) => {
              const pin = pins[booklet.id];
              
              return (
                <motion.div
                  key={booklet.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card 
                    className="h-full border border-[#EEF0F5] bg-white transition-all duration-300 hover:-translate-y-1"
                    style={{
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(7,21,82,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="font-display text-xl font-semibold text-primary mb-2 truncate">
                            {booklet.title || booklet.property_name || "Sans titre"}
                          </CardTitle>
                          {(booklet.subtitle || booklet.welcome_message) && (
                            <CardDescription className="text-sm text-[#707070] line-clamp-2 leading-relaxed">
                              {booklet.subtitle || booklet.welcome_message}
                            </CardDescription>
                          )}
                        </div>
                        <Badge 
                          className={`flex-shrink-0 rounded-xl px-3 py-1 font-medium ${
                            booklet.status === 'published' 
                              ? 'bg-primary text-white' 
                              : 'bg-[#F7F9FC] text-[#6C6C6C] border border-[#ECEEF3]'
                          }`}
                        >
                          {booklet.status === 'published' ? 'Publié' : 'Brouillon'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* PIN Block */}
                      {booklet.status === 'published' && pin && (
                        <div 
                          className="p-4 rounded-lg space-y-3"
                          style={{
                            background: '#F9FAFB',
                            border: '1px solid #EEF0F5'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-primary uppercase tracking-wide">
                              Code PIN
                            </span>
                            <code 
                              className="text-lg font-bold text-primary px-3 py-1 rounded-lg"
                              style={{
                                background: '#FFFFFF',
                                fontFamily: 'Monaco, Consolas, monospace',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
                              }}
                            >
                              {pin.pin_code}
                            </code>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-[#E1E5EC] hover:bg-[#F2F4F9] transition-colors"
                              onClick={() => handleCopyCode(pin.pin_code)}
                            >
                              <Copy className="w-3 h-3 mr-1.5" />
                              Code
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-[#E1E5EC] hover:bg-[#F2F4F9] transition-colors"
                              onClick={() => handleCopyLink(pin.pin_code)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1.5" />
                              Lien
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-[#E1E5EC] hover:bg-[#F2F4F9] transition-colors"
                              onClick={() => handleGenerateQR(pin.pin_code, booklet.property_name || 'livret')}
                            >
                              <QrCode className="w-3 h-3 mr-1.5" />
                              QR
                            </Button>
                          </div>
                          
                          <button
                            className="w-full text-xs text-primary hover:underline transition-all py-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                            onClick={() => handleRegeneratePin(booklet.id)}
                          >
                            Régénérer le code PIN
                          </button>
                        </div>
                      )}
                      
                      {/* Stats Line */}
                      <div className="flex items-center text-sm text-[#6C6C6C] gap-2">
                        <span>Vues : {booklet.views_count || 0}</span>
                        <span>·</span>
                        <span className="truncate">
                          {formatDistanceToNow(new Date(booklet.updated_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-[#122372] text-white rounded-lg transition-all duration-200"
                          onClick={() => navigate(`/booklets/${booklet.id}/wizard`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-[#E1E5EC] hover:bg-[#F2F4F9] transition-colors"
                          onClick={() => handlePreview(booklet.id)}
                          title="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-[#E1E5EC] hover:bg-[#F2F4F9] transition-colors"
                          onClick={() => handleDuplicate(booklet)}
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-[#E1E5EC] hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => handleDelete(booklet.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
