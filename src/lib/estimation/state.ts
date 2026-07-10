import { useCallback, useEffect, useState } from "react";
import { emptyEstimationForm, type EstimationFormData } from "./types";

// Persistance formulaire dans sessionStorage (pas localStorage : l'historique
// des estimations validées y est déjà, on ne veut pas confondre les deux).
// Les photos (base64) SONT persistées ici pendant la session en cours ; elles
// seront exclues au moment de la sauvegarde définitive dans l'historique
// (règle localStorage §2 du prompt).
const KEY = "estim.form.draft.v1";

function loadDraft(): EstimationFormData {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return emptyEstimationForm();
    const parsed = JSON.parse(raw) as EstimationFormData;
    // Fusion défensive : si le schéma évolue, on ne casse pas le brouillon.
    return { ...emptyEstimationForm(), ...parsed };
  } catch {
    return emptyEstimationForm();
  }
}

export function useEstimationForm() {
  const [data, setData] = useState<EstimationFormData>(() => loadDraft());

  useEffect(() => {
    try {
      // Le brouillon exclut les photos (base64 volumineux → quota sessionStorage).
      // Les photos vivent seulement en mémoire React pendant la session courante.
      const { photos: _photos, ...rest } = data;
      sessionStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      // Quota session dépassé → on ne bloque pas la saisie, on ignore.
    }
  }, [data]);

  const patch = useCallback(<K extends keyof EstimationFormData>(
    key: K, value: Partial<EstimationFormData[K]>,
  ) => {
    setData((d) => ({ ...d, [key]: { ...(d[key] as object), ...(value as object) } as EstimationFormData[K] }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setData(emptyEstimationForm());
  }, []);

  return { data, setData, patch, reset };
}
