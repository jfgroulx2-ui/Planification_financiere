import { donneesFiscales2025 } from "../../data/tax-2025";
import { arrondir2 } from "../tax/shared";

export interface EntreeEstimationPsv {
  age: number;
  ageDebutPension: number;
  anneesResidenceCanadaApres18?: number;
}

export interface ResultatEstimationPsv {
  age: number;
  ageDebutPension: number;
  montantMensuelBrut: number;
  montantAnnuelBrut: number;
  proportionResidence: number;
  facteurBonification: number;
}

export interface ResultatRecuperationPsv {
  seuilRecuperation: number;
  revenuNet: number;
  montantRecuperation: number;
  montantPsvNet: number;
}

/**
 * Estime la PSV brute annuelle selon l'âge, la résidence et l'âge de départ.
 */
export function estimerPsv2025(
  entree: EntreeEstimationPsv,
): ResultatEstimationPsv {
  const regles = donneesFiscales2025.pension.psv;
  const ageDebutPension = Math.min(
    regles.ageMaximalBonifie,
    Math.max(regles.ageMinimal, entree.ageDebutPension),
  );
  const anneesResidenceCanadaApres18 = Math.max(
    0,
    entree.anneesResidenceCanadaApres18 ?? regles.anneesResidencePleine,
  );
  const proportionResidence = Math.min(
    1,
    anneesResidenceCanadaApres18 / regles.anneesResidencePleine,
  );

  if (entree.age < ageDebutPension) {
    return {
      age: entree.age,
      ageDebutPension,
      montantMensuelBrut: 0,
      montantAnnuelBrut: 0,
      proportionResidence: arrondir2(proportionResidence),
      facteurBonification: 0,
    };
  }

  const montantMensuelBase =
    entree.age >= regles.ageMajoration75Plus
      ? regles.montantMensuelMaximal75Plus
      : regles.montantMensuelMaximal65a74;
  const ecartMoisBonification = Math.max(0, ageDebutPension - regles.ageMinimal) * 12;
  const facteurBonification =
    1 + ecartMoisBonification * regles.facteurBonificationMensuelApres65;
  const montantMensuelBrut =
    montantMensuelBase * facteurBonification * proportionResidence;

  return {
    age: entree.age,
    ageDebutPension,
    montantMensuelBrut: arrondir2(montantMensuelBrut),
    montantAnnuelBrut: arrondir2(montantMensuelBrut * 12),
    proportionResidence: arrondir2(proportionResidence),
    facteurBonification: arrondir2(facteurBonification),
  };
}

/**
 * Calcule la récupération de la PSV au taux officiel de 15 %.
 */
export function calculerRecuperationPsv2025(
  revenuNet: number,
  montantPsvBrutAnnuel: number,
): ResultatRecuperationPsv {
  const regles = donneesFiscales2025.pension.psv;
  const excedent = Math.max(0, revenuNet - regles.seuilRecuperation2025);
  const montantRecuperation = Math.min(
    montantPsvBrutAnnuel,
    excedent * regles.tauxRecuperation,
  );

  return {
    seuilRecuperation: regles.seuilRecuperation2025,
    revenuNet: arrondir2(revenuNet),
    montantRecuperation: arrondir2(montantRecuperation),
    montantPsvNet: arrondir2(montantPsvBrutAnnuel - montantRecuperation),
  };
}
