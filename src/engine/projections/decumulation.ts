import { arrondir2 } from "../tax/shared";

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

/**
 * Simule un decaissement annuel simple avec retrait en debut d'annee.
 *
 * Hypothese de travail :
 * - le retrait est pris en debut d'annee ;
 * - le solde residuel croit ensuite au rendement indique ;
 * - le retrait est indexe annuellement.
 *
 * Source :
 * - Modele interne de simulation deterministe pour la V1
 * - Verification effectuee le 2026-05-15
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
