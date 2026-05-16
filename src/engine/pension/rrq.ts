import { donneesFiscales2025 } from "../../data/tax-2025";
import { arrondir2 } from "../tax/shared";

export interface EntreeEstimationRrq {
  ageDebutRente: number;
  proportionCotisation?: number;
}

export interface ResultatEstimationRrq {
  ageDebutRente: number;
  montantMensuel: number;
  montantAnnuel: number;
  facteurAjustement: number;
  proportionCotisation: number;
}

/**
 * Estime la rente de retraite du RRQ selon un modèle simplifié.
 */
export function estimerRenteRrq2025(
  entree: EntreeEstimationRrq,
): ResultatEstimationRrq {
  const regles = donneesFiscales2025.pension.rrqRetraite;
  const ageDebutRente = Math.min(
    regles.ageMaximalBonifie,
    Math.max(regles.ageMinimal, entree.ageDebutRente),
  );
  const proportionCotisation = Math.min(
    1,
    Math.max(
      0,
      entree.proportionCotisation ??
        regles.proportionCotisationMaximaleParDefaut,
    ),
  );
  const ecartMois = (ageDebutRente - regles.ageNormal) * 12;
  const facteurAjustement =
    ecartMois < 0
      ? 1 + ecartMois * regles.facteurReductionMensuelAvant65
      : 1 + ecartMois * regles.facteurBonificationMensuelApres65;
  const montantMensuel =
    regles.renteMensuelleMaximale65 * proportionCotisation * facteurAjustement;

  return {
    ageDebutRente,
    montantMensuel: arrondir2(montantMensuel),
    montantAnnuel: arrondir2(montantMensuel * 12),
    facteurAjustement: arrondir2(facteurAjustement),
    proportionCotisation,
  };
}
