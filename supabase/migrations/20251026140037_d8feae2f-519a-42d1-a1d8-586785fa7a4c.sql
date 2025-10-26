-- Mettre à jour l'utilisateur avec le rôle Premium
UPDATE public.users
SET 
  role = 'pack_premium',
  subscription_status = 'active',
  updated_at = now()
WHERE email = 'clesdazur.conciergerie@gmail.com';

-- Mettre à jour ou insérer le rôle dans user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'pack_premium'::app_role
FROM public.users
WHERE email = 'clesdazur.conciergerie@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Supprimer les anciens rôles gratuits/trial
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM public.users WHERE email = 'clesdazur.conciergerie@gmail.com')
  AND role IN ('free', 'free_trial', 'demo_user');

-- Supprimer l'ancienne subscription si elle existe
DELETE FROM public.subscriptions
WHERE user_id = (SELECT id FROM public.users WHERE email = 'clesdazur.conciergerie@gmail.com');

-- Créer la nouvelle subscription Premium
INSERT INTO public.subscriptions (
  user_id,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  id,
  'active'::subscription_status,
  now(),
  now() + interval '1 year',
  false
FROM public.users
WHERE email = 'clesdazur.conciergerie@gmail.com';