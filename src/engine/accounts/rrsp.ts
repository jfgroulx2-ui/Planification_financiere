import { donneesFiscales2025 } from "../../data/tax-2025";

export interface EntreeDroitsREER {
  revenuGagneAnneePrecedente: number;
  facteurEquivalence?: number;
  droitsReportes?: number;
}

/**
 * Calcule les nouveaux droits REER d'une annee selon la regle de base.
 *
 * Source :
 * - CRA, calcul des droits de cotisation REER
 * - Verification manuelle effectuee le 2026-05-10
 */
export function calculerDroitsREER(entree: EntreeDroitsREER): number {
  const nouveauxDroits = Math.min(
    Math.max(0, entree.revenuGagneAnneePrecedente) * donneesFiscales2025.reer.tauxAccumulation,
    donneesFiscales2025.reer.plafondNouveauxDroits,
  );

  return Math.max(
    0,
    nouveauxDroits - (entree.facteurEquivalence ?? 0) + (entree.droitsReportes ?? 0),
  );
}
