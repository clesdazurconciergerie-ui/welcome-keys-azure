-- Vérifier et réactiver RLS sur toutes les tables sensibles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklet_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wifi_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booklets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_places ENABLE ROW LEVEL SECURITY;

-- Protéger la table plans contre les modifications
DROP POLICY IF EXISTS "plans_no_client_write" ON public.plans;
CREATE POLICY "plans_no_client_write" ON public.plans
  FOR ALL 
  USING (false) 
  WITH CHECK (false);

-- S'assurer que la table plans a RLS activé
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;