import { calculerRecuperationPsv2025, estimerPsv2025 } from "../pension/psv";
import { estimerRenteRrq2025 } from "../pension/rrq";
import { calculerImpotFederal2025 } from "../tax/federal";
import { calculerImpotQuebec2025 } from "../tax/quebec";
import { arrondir2 } from "../tax/shared";
import type { ResultatAccumulation } from "./accumulation";

export interface EntreeDecaissement {
  capitalInitial: number;
  retraitAnnuelInitial: number;
  rendementAnnuel: number;
  indexationRetrait: number;
  nombreAnnees: number;
}

export interface PointDecaissement {
  anneeIndex: number;
  retraitAnnuel: number;
  valeurDebut: number;
  valeurApresRetrait: number;
  croissance: number;
  valeurFin: number;
}

export interface ResultatDecaissement {
  capitalFinal: number;
  capitalEpuise: boolean;
  anneeEpuisement: number | null;
  retraitTotal: number;
  points: PointDecaissement[];
}

export type StrategieDecaissement = "classique";

export interface EntreeDecaissementRetraite {
  anneeDebut: number;
  ageDebut: number;
  soldeReerInitial: number;
  soldeCeliInitial: number;
  soldeNonEnregistreInitial: number;
  retraitAnnuelCibleInitial: number;
  rendementReer: number;
  rendementCeli: number;
  rendementNonEnregistre: number;
  indexationRetrait: number;
  nombreAnnees: number;
  ageDebutRrq?: number;
  proportionCotisationRrq?: number;
  ageDebutPsv?: number;
  anneesResidenceCanadaApres18?: number;
  strategie?: StrategieDecaissement;
}

export interface PointDecaissementRetraite {
  annee: number;
  age: number;
  salaire: number;
  rrq: number;
  psv: number;
  retraitCible: number;
  retraitReer: number;
  retraitCeli: number;
  retraitNonEnregistre: number;
  retraitTotalBrut: number;
  revenuImposableTotal: number;
  impotTotal: number;
  netDisponible: number;
  recuperationPsv: number;
  soldeReerDebut: number;
  soldeCeliDebut: number;
  soldeNonEnregistreDebut: number;
  soldeReerFin: number;
  soldeCeliFin: number;
  soldeNonEnregistreFin: number;
}

export interface ResultatDecaissementRetraite {
  capitalInitialTotal: number;
  capitalFinalTotal: number;
  capitalEpuise: boolean;
  anneeEpuisement: number | null;
  points: PointDecaissementRetraite[];
}

/**
 * Simule un décaissement annuel simple avec retrait en début d'année.
 */
export function simulerDecaissementAnnuel(
  entree: EntreeDecaissement,
): ResultatDecaissement {
  const points: PointDecaissement[] = [];
  let valeurDebut = Math.max(0, entree.capitalInitial);
  let retraitAnnuel = Math.max(0, entree.retraitAnnuelInitial);
  let retraitTotal = 0;
  let anneeEpuisement: number | null = null;

  for (let anneeIndex = 1; anneeIndex <= entree.nombreAnnees; anneeIndex += 1) {
    const retraitEffectif = Math.min(valeurDebut, retraitAnnuel);
    const valeurApresRetrait = Math.max(0, valeurDebut - retraitEffectif);
    const croissance = valeurApresRetrait * entree.rendementAnnuel;
    const valeurFin = Math.max(0, valeurApresRetrait + croissance);

    points.push({
      anneeIndex,
      retraitAnnuel: arrondir2(retraitEffectif),
      valeurDebut: arrondir2(valeurDebut),
      valeurApresRetrait: arrondir2(valeurApresRetrait),
      croissance: arrondir2(croissance),
      valeurFin: arrondir2(valeurFin),
    });

    retraitTotal += retraitEffectif;

    if (valeurDebut > 0 && retraitEffectif < retraitAnnuel && anneeEpuisement === null) {
      anneeEpuisement = anneeIndex;
    }

    valeurDebut = valeurFin;
    retraitAnnuel *= 1 + entree.indexationRetrait;
  }

  return {
    capitalFinal: arrondir2(valeurDebut),
    capitalEpuise: anneeEpuisement !== null,
    anneeEpuisement,
    retraitTotal: arrondir2(retraitTotal),
    points,
  };
}

function calculerRetraitsClassiques(
  retraitCible: number,
  soldeNonEnregistre: number,
  soldeReer: number,
  soldeCeli: number,
) {
  let restant = retraitCible;
  const retraitNonEnregistre = Math.min(soldeNonEnregistre, restant);
  restant -= retraitNonEnregistre;
  const retraitReer = Math.min(soldeReer, restant);
  restant -= retraitReer;
  const retraitCeli = Math.min(soldeCeli, restant);

  return {
    retraitNonEnregistre: arrondir2(retraitNonEnregistre),
    retraitReer: arrondir2(retraitReer),
    retraitCeli: arrondir2(retraitCeli),
  };
}

/**
 * Simule un décaissement de retraite en années calendaires avec RRQ et PSV.
 */
export function simulerDecaissementRetraite(
  entree: EntreeDecaissementRetraite,
): ResultatDecaissementRetraite {
  let soldeReer = Math.max(0, entree.soldeReerInitial);
  let soldeCeli = Math.max(0, entree.soldeCeliInitial);
  let soldeNonEnregistre = Math.max(0, entree.soldeNonEnregistreInitial);
  let retraitCible = Math.max(0, entree.retraitAnnuelCibleInitial);
  let anneeEpuisement: number | null = null;
  const points: PointDecaissementRetraite[] = [];
  const capitalInitialTotal = arrondir2(
    soldeReer + soldeCeli + soldeNonEnregistre,
  );

  for (let index = 0; index < entree.nombreAnnees; index += 1) {
    const annee = entree.anneeDebut + index;
    const age = entree.ageDebut + index;
    const soldeReerDebut = soldeReer;
    const soldeCeliDebut = soldeCeli;
    const soldeNonEnregistreDebut = soldeNonEnregistre;
    const retraits = calculerRetraitsClassiques(
      retraitCible,
      soldeNonEnregistreDebut,
      soldeReerDebut,
      soldeCeliDebut,
    );
    const rrq = estimerRenteRrq2025({
      ageDebutRente: entree.ageDebutRrq ?? 65,
      proportionCotisation: entree.proportionCotisationRrq ?? 1,
    });
    const montantRrq = age >= rrq.ageDebutRente ? rrq.montantAnnuel : 0;
    const psvBrute = estimerPsv2025({
      age,
      ageDebutPension: entree.ageDebutPsv ?? 65,
      anneesResidenceCanadaApres18: entree.anneesResidenceCanadaApres18,
    });
    const retraitTotalBrut =
      retraits.retraitNonEnregistre + retraits.retraitReer + retraits.retraitCeli;
    const revenuImposableTotal =
      retraits.retraitReer + montantRrq + psvBrute.montantAnnuelBrut;
    const recuperationPsv = calculerRecuperationPsv2025(
      revenuImposableTotal,
      psvBrute.montantAnnuelBrut,
    );
    const impotFederal = calculerImpotFederal2025({
      revenuEmploi: revenuImposableTotal,
      resideAuQuebec: true,
    });
    const impotQuebec = calculerImpotQuebec2025({
      revenuEmploi: revenuImposableTotal,
    });
    const impotTotal = arrondir2(impotFederal.impotNet + impotQuebec.impotNet);
    const netDisponible = arrondir2(
      Math.max(
        0,
        retraitTotalBrut + montantRrq + recuperationPsv.montantPsvNet - impotTotal,
      ),
    );

    soldeNonEnregistre =
      (soldeNonEnregistreDebut - retraits.retraitNonEnregistre) *
      (1 + entree.rendementNonEnregistre);
    soldeReer = (soldeReerDebut - retraits.retraitReer) * (1 + entree.rendementReer);
    soldeCeli = (soldeCeliDebut - retraits.retraitCeli) * (1 + entree.rendementCeli);

    if (retraitTotalBrut < retraitCible && anneeEpuisement === null) {
      anneeEpuisement = annee;
    }

    points.push({
      annee,
      age,
      salaire: 0,
      rrq: arrondir2(montantRrq),
      psv: recuperationPsv.montantPsvNet,
      retraitCible: arrondir2(retraitCible),
      retraitReer: retraits.retraitReer,
      retraitCeli: retraits.retraitCeli,
      retraitNonEnregistre: retraits.retraitNonEnregistre,
      retraitTotalBrut: arrondir2(retraitTotalBrut),
      revenuImposableTotal: arrondir2(revenuImposableTotal),
      impotTotal,
      netDisponible,
      recuperationPsv: recuperationPsv.montantRecuperation,
      soldeReerDebut: arrondir2(soldeReerDebut),
      soldeCeliDebut: arrondir2(soldeCeliDebut),
      soldeNonEnregistreDebut: arrondir2(soldeNonEnregistreDebut),
      soldeReerFin: arrondir2(soldeReer),
      soldeCeliFin: arrondir2(soldeCeli),
      soldeNonEnregistreFin: arrondir2(soldeNonEnregistre),
    });

    retraitCible *= 1 + entree.indexationRetrait;
  }

  return {
    capitalInitialTotal,
    capitalFinalTotal: arrondir2(soldeReer + soldeCeli + soldeNonEnregistre),
    capitalEpuise: anneeEpuisement !== null,
    anneeEpuisement,
    points,
  };
}

export interface EntreeDecaissementDepuisAccumulation
  extends Omit<
    EntreeDecaissementRetraite,
    | "anneeDebut"
    | "ageDebut"
    | "soldeReerInitial"
    | "soldeCeliInitial"
    | "soldeNonEnregistreInitial"
  > {}

/**
 * Démarre la retraite à partir des soldes calculés en fin d'accumulation.
 */
export function simulerDecaissementDepuisAccumulation(
  accumulation: ResultatAccumulation,
  entree: EntreeDecaissementDepuisAccumulation,
): ResultatDecaissementRetraite {
  return simulerDecaissementRetraite({
    ...entree,
    anneeDebut: accumulation.anneeRetraite,
    ageDebut: accumulation.ageRetraite,
    soldeReerInitial: accumulation.capitalReerRetraite,
    soldeCeliInitial: accumulation.capitalCeliRetraite,
    soldeNonEnregistreInitial: accumulation.capitalNonEnregistreRetraite,
  });
}
