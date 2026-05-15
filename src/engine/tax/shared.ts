import type { PalierImposition } from "../../data/tax-2025";

export function arrondir2(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 100) / 100;
}

export function borner(valeur: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(valeur, minimum), maximum);
}

export function calculerImpotProgressif(
  revenuImposable: number,
  paliers: readonly PalierImposition[],
): number {
  let total = 0;
  let precedent = 0;

  for (const palier of paliers) {
    const limite = palier.plafond ?? revenuImposable;
    const montantDansLePalier = Math.max(0, Math.min(revenuImposable, limite) - precedent);

    total += montantDansLePalier * palier.taux;
    precedent = limite;

    if (revenuImposable <= limite) {
      break;
    }
  }

  return arrondir2(total);
}

export function calculerMontantDecroissant(
  montantMaximum: number,
  montantMinimum: number,
  revenuNet: number,
  seuilReductionDebut: number,
  seuilReductionFin: number,
): number {
  if (revenuNet <= seuilReductionDebut) {
    return montantMaximum;
  }

  if (revenuNet >= seuilReductionFin) {
    return montantMinimum;
  }

  const progression =
    (revenuNet - seuilReductionDebut) / (seuilReductionFin - seuilReductionDebut);

  return montantMaximum - (montantMaximum - montantMinimum) * progression;
}
