import { donneesFiscales2025 } from "../../data/tax-2025";

export interface EntreeDroitsCELI {
  anneeCourante: number;
  anneeNaissance: number;
  anneeArriveeCanada?: number;
  droitsReportes?: number;
  retraitsAnneePrecedente?: number;
  cotisationsCumulatives?: number;
}

/**
 * Calcule les droits CELI disponibles a une annee donnee.
 *
 * Source :
 * - CRA, droits de cotisation CELI
 * - Verification manuelle effectuee le 2026-05-10
 */
export function calculerDroitsCELIDisponibles(entree: EntreeDroitsCELI): number {
  const anneeEligibiliteAge = entree.anneeNaissance + 18;
  const anneeEligibiliteResidence = entree.anneeArriveeCanada ?? anneeEligibiliteAge;
  const premiereAnnee = Math.max(2009, anneeEligibiliteAge, anneeEligibiliteResidence);
  let droitsCumules = 0;

  for (let annee = premiereAnnee; annee <= entree.anneeCourante; annee += 1) {
    droitsCumules += donneesFiscales2025.celi.plafondAnnuel[annee] ?? 0;
  }

  return Math.max(
    0,
    droitsCumules +
      (entree.droitsReportes ?? 0) +
      (entree.retraitsAnneePrecedente ?? 0) -
      (entree.cotisationsCumulatives ?? 0),
  );
}
