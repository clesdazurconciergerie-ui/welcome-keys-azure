export type ICalFreshnessState = "fresh" | "attention" | "stale" | "never" | "paused";

export interface ICalFreshness {
  state: ICalFreshnessState;
  label: string;
  ageHours: number | null;
}

export function getICalFreshness(
  lastSuccessAt: string | null | undefined,
  isActive: boolean,
  nowMs = Date.now(),
): ICalFreshness {
  if (!isActive) return { state: "paused", label: "Planification en pause", ageHours: null };
  if (!lastSuccessAt) return { state: "never", label: "Aucun succès serveur", ageHours: null };

  const successMs = new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(successMs)) {
    return { state: "never", label: "Date de succès invalide", ageHours: null };
  }

  const ageHours = Math.max(0, (nowMs - successMs) / 3_600_000);
  if (ageHours <= 6) return { state: "fresh", label: "Données à jour", ageHours };
  if (ageHours <= 12) return { state: "attention", label: "À surveiller", ageHours };
  return { state: "stale", label: "Données anciennes", ageHours };
}
