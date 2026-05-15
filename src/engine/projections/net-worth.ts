import { arrondir2 } from "../tax/shared";

export interface EntreeProjectionPatrimoine {
  valeurInitiale: number;
  contributionAnnuelle: number;
  rendementAnnuel: number;
  nombreAnnees: number;
}

/**
 * Projette un patrimoine avec rendement constant et contribution annuelle en fin d'annee.
 *
 * Source :
 * - Formule de valeur future standard utilisee comme cas analytique de reference
 * - Verification effectuee le 2026-05-10
 */
export function projeterPatrimoineAnnuel(
  entree: EntreeProjectionPatrimoine,
): number {
  let valeur = Math.max(0, entree.valeurInitiale);

  for (let annee = 0; annee < entree.nombreAnnees; annee += 1) {
    valeur = valeur * (1 + entree.rendementAnnuel) + entree.contributionAnnuelle;
  }

  return arrondir2(valeur);
}
