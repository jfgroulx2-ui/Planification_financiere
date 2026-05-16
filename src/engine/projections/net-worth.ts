import { arrondir2 } from "../tax/shared";

export interface EntreeProjectionPatrimoine {
  valeurInitiale: number;
  contributionAnnuelle: number;
  rendementAnnuel: number;
  nombreAnnees: number;
}

export interface PointProjectionPatrimoine {
  anneeIndex: number;
  valeurDebut: number;
  contribution: number;
  croissance: number;
  valeurFin: number;
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

/**
 * Produit la trajectoire annee par annee d'une projection de patrimoine.
 *
 * Source :
 * - Meme formule analytique que la projection agregee
 * - Verification effectuee le 2026-05-15
 */
export function projeterPatrimoineAnnuelParAnnee(
  entree: EntreeProjectionPatrimoine,
): PointProjectionPatrimoine[] {
  const points: PointProjectionPatrimoine[] = [];
  let valeurDebut = Math.max(0, entree.valeurInitiale);

  for (let anneeIndex = 1; anneeIndex <= entree.nombreAnnees; anneeIndex += 1) {
    const croissance = valeurDebut * entree.rendementAnnuel;
    const valeurFin = valeurDebut + croissance + entree.contributionAnnuelle;

    points.push({
      anneeIndex,
      valeurDebut: arrondir2(valeurDebut),
      contribution: arrondir2(entree.contributionAnnuelle),
      croissance: arrondir2(croissance),
      valeurFin: arrondir2(valeurFin),
    });

    valeurDebut = valeurFin;
  }

  return points;
}
