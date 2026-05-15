import { arrondir2 } from "../tax/shared";

export interface EntreeHypotheque {
  capitalInitial: number;
  tauxNominalAnnuel: number;
  anneesAmortissement: number;
  versementsParAn: number;
}

/**
 * Calcule le paiement d'une hypothque canadienne a capitalisation semi-annuelle.
 *
 * Source :
 * - ACFC, calculatrices hypothecaires canadiennes
 * - Verification de formule effectuee le 2026-05-10
 */
export function calculerPaiementHypothecaireCanadien(
  entree: EntreeHypotheque,
): number {
  const capital = Math.max(0, entree.capitalInitial);
  const versementsParAn = entree.versementsParAn;
  const nombreVersements = entree.anneesAmortissement * versementsParAn;
  const tauxPeriodique =
    Math.pow(1 + entree.tauxNominalAnnuel / 2, 2 / versementsParAn) - 1;

  if (tauxPeriodique === 0) {
    return arrondir2(capital / nombreVersements);
  }

  const paiement =
    (capital * tauxPeriodique) / (1 - Math.pow(1 + tauxPeriodique, -nombreVersements));

  return arrondir2(paiement);
}
