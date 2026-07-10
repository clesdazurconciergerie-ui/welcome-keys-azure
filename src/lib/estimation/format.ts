/**
 * Formatage FR — corrige le bug §8.1 : U+202F (espace fine insécable)
 * n'existe pas dans Playfair Display et fait coller les chiffres.
 * On force U+00A0 dans TOUS les libellés du rapport.
 */
const NBSP = "\u00A0";
const NNBSP = "\u202F";

export function formatEur(n: number): string {
  const s = Math.round(n).toLocaleString("fr-FR").replace(new RegExp(NNBSP, "g"), NBSP);
  return `${s}${NBSP}€`;
}
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(new RegExp(NNBSP, "g"), NBSP);
}
export function formatPct(n: number): string {
  return `${Math.round(n)}${NBSP}%`;
}
