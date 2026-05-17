import { estimerRenteRrq2025 } from "../pension/rrq";
import { calculerRecuperationPsv2025, estimerPsv2025 } from "../pension/psv";
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
  valeurImmobiliereInitiale?: number;
  soldeHypothecaireInitial?: number;
  croissanceImmobiliere?: number;
  ageVenteMaison?: number | null;
  retraitAnnuelCibleInitial: number;
  objectifNetAnnuel?: number;
  rendementReer: number;
  rendementCeli: number;
  rendementNonEnregistre: number;
  indexationRetrait: number;
  nombreAnnees: number;
  ageDebutRrq?: number;
  proportionCotisationRrq?: number;
  anneesResidenceCanadaApres18?: number;
  ageDebutPsv?: number;
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
  objectifNetAnnuel: number;
  ecartObjectifNet: number;
  venteMaison: number;
  valeurImmobiliereDebut: number;
  valeurImmobiliereFin: number;
  soldeHypothecaireDebut: number;
  soldeHypothecaireFin: number;
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
  objectifNetAnnuel: number;
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
): { retraitNonEnregistre: number; retraitReer: number; retraitCeli: number } {
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
 * Simule un décaissement de retraite en années calendaires avec l'âge affiché.
 *
 * Hypothèses de travail :
 * - stratégie classique : non enregistré, puis REER/FERR, puis CELI ;
 * - RRQ et PSV sont estimés automatiquement selon les paramètres d'entrée ;
 * - les retraits REER/FERR sont comptés comme du revenu imposable ;
 * - la récupération PSV est calculée à 15 % de l'excédent au-delà du seuil ;
 * - les retraits non enregistrés sont traités comme non imposables dans cette V1 ;
 * - la maison peut être vendue à un âge donné, et le produit net est versé
 *   dans le non enregistré au début de cette année ;
 * - après le début de la retraite, le solde hypothécaire résiduel est conservé
 *   constant jusqu'à la vente ou jusqu'à la fin de l'horizon.
 */
export function simulerDecaissementRetraite(
  entree: EntreeDecaissementRetraite,
): ResultatDecaissementRetraite {
  let soldeReer = Math.max(0, entree.soldeReerInitial);
  let soldeCeli = Math.max(0, entree.soldeCeliInitial);
  let soldeNonEnregistre = Math.max(0, entree.soldeNonEnregistreInitial);
  let valeurImmobiliere = Math.max(0, entree.valeurImmobiliereInitiale ?? 0);
  let soldeHypothecaire = Math.max(0, entree.soldeHypothecaireInitial ?? 0);
  let retraitCible = Math.max(0, entree.retraitAnnuelCibleInitial);
  let anneeEpuisement: number | null = null;
  let maisonVendue = valeurImmobiliere === 0;
  const points: PointDecaissementRetraite[] = [];
  const capitalInitialTotal = arrondir2(
    soldeReer + soldeCeli + soldeNonEnregistre,
  );
  const objectifNetAnnuel = Math.max(
    0,
    entree.objectifNetAnnuel ?? entree.retraitAnnuelCibleInitial,
  );

  for (let index = 0; index < entree.nombreAnnees; index += 1) {
    const annee = entree.anneeDebut + index;
    const age = entree.ageDebut + index;
    const soldeReerDebut = soldeReer;
    const soldeCeliDebut = soldeCeli;
    const valeurImmobiliereDebut = valeurImmobiliere;
    const soldeHypothecaireDebut = soldeHypothecaire;
    let soldeNonEnregistreDebut = soldeNonEnregistre;
    let venteMaison = 0;

    if (
      !maisonVendue &&
      entree.ageVenteMaison !== null &&
      entree.ageVenteMaison !== undefined &&
      age >= entree.ageVenteMaison
    ) {
      venteMaison = arrondir2(
        Math.max(0, valeurImmobiliereDebut - soldeHypothecaireDebut),
      );
      soldeNonEnregistreDebut += venteMaison;
      valeurImmobiliere = 0;
      soldeHypothecaire = 0;
      maisonVendue = true;
    }

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
    soldeReer =
      (soldeReerDebut - retraits.retraitReer) * (1 + entree.rendementReer);
    soldeCeli =
      (soldeCeliDebut - retraits.retraitCeli) * (1 + entree.rendementCeli);

    if (!maisonVendue) {
      valeurImmobiliere = valeurImmobiliere * (1 + (entree.croissanceImmobiliere ?? 0));
    }

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
      objectifNetAnnuel: arrondir2(objectifNetAnnuel),
      ecartObjectifNet: arrondir2(netDisponible - objectifNetAnnuel),
      venteMaison,
      valeurImmobiliereDebut: arrondir2(valeurImmobiliereDebut),
      valeurImmobiliereFin: arrondir2(valeurImmobiliere),
      soldeHypothecaireDebut: arrondir2(soldeHypothecaireDebut),
      soldeHypothecaireFin: arrondir2(soldeHypothecaire),
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
    objectifNetAnnuel: arrondir2(objectifNetAnnuel),
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
    | "valeurImmobiliereInitiale"
    | "soldeHypothecaireInitial"
    | "objectifNetAnnuel"
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
    valeurImmobiliereInitiale: accumulation.valeurImmobiliereRetraite,
    soldeHypothecaireInitial: accumulation.soldeHypothecaireRetraite,
    objectifNetAnnuel: accumulation.objectifDecaissementSuggereRetraite,
  });
}
