-- Ajouter la colonne has_wifi à la table wifi_credentials
ALTER TABLE public.wifi_credentials 
ADD COLUMN has_wifi boolean NOT NULL DEFAULT false;

-- Initialiser has_wifi = true pour les enregistrements existants qui ont déjà des données
UPDATE public.wifi_credentials 
SET has_wifi = true 
WHERE (ssid IS NOT NULL AND ssid != '') 
   OR (password IS NOT NULL AND password != '');

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.wifi_credentials.has_wifi IS 'Indique si le logement dispose du Wi-Fi. Si false, la section Wi-Fi est masquée côté invité.';