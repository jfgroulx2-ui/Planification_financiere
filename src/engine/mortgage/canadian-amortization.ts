import { arrondir2 } from "../tax/shared";

export interface EntreeHypotheque {
  capitalInitial: number;
  tauxNominalAnnuel: number;
  anneesAmortissement: number;
  versementsParAn: number;
}

export interface LigneAmortissementHypothecaire {
  numeroVersement: number;
  paiement: number;
  interets: number;
  capital: number;
  soldeAvantVersement: number;
  soldeApresVersement: number;
}

/**
 * Calcule le paiement d'une hypothèque canadienne à capitalisation semi-annuelle.
 *
 * Source :
 * - ACFC, calculatrices hypothécaires canadiennes
 * - Vérification de formule effectuée le 2026-05-10
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
    (capital * tauxPeriodique) /
    (1 - Math.pow(1 + tauxPeriodique, -nombreVersements));

  return arrondir2(paiement);
}

/**
 * Produit le tableau d'amortissement complet d'une hypothèque canadienne.
 */
export function calculerTableauAmortissementHypothecaireCanadien(
  entree: EntreeHypotheque,
): LigneAmortissementHypothecaire[] {
  const capitalInitial = Math.max(0, entree.capitalInitial);
  const nombreVersements = Math.max(
    0,
    Math.round(entree.anneesAmortissement * entree.versementsParAn),
  );

  if (capitalInitial === 0 || nombreVersements === 0) {
    return [];
  }

  const paiement = calculerPaiementHypothecaireCanadien(entree);
  const tauxPeriodique =
    Math.pow(1 + entree.tauxNominalAnnuel / 2, 2 / entree.versementsParAn) - 1;
  const lignes: LigneAmortissementHypothecaire[] = [];
  let solde = capitalInitial;

  for (
    let numeroVersement = 1;
    numeroVersement <= nombreVersements && solde > 0.000001;
    numeroVersement += 1
  ) {
    const interets = solde * tauxPeriodique;
    const capital = Math.min(solde, paiement - interets);
    const paiementEffectif = interets + capital;
    const soldeApresVersement = Math.max(0, solde - capital);

    lignes.push({
      numeroVersement,
      paiement: arrondir2(paiementEffectif),
      interets: arrondir2(interets),
      capital: arrondir2(capital),
      soldeAvantVersement: arrondir2(solde),
      soldeApresVersement: arrondir2(soldeApresVersement),
    });

    solde = soldeApresVersement;
  }

  return lignes;
}
