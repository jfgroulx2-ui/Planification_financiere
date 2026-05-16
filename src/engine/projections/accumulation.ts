import type { ProfilUtilisateurMinimal } from "../types";
import {
  calculerTableauAmortissementHypothecaireCanadien,
} from "../mortgage/canadian-amortization";
import { calculerImpotFederal2025 } from "../tax/federal";
import { calculerCotisationsSociales2025 } from "../tax/payroll";
import { arrondir2 } from "../tax/shared";
import { calculerImpotQuebec2025 } from "../tax/quebec";

export interface EntreeAccumulation {
  profil: ProfilUtilisateurMinimal;
  anneeCourante: number;
  revenuEmploiActuel: number;
  autresRevenusImposables?: number;
  depensesAnnuellesActuelles?: number;
  cotisationReerAnnuelle?: number;
  cotisationCeliAnnuelle?: number;
  cotisationNonEnregistreeAnnuelle?: number;
  soldeReerInitial?: number;
  soldeCeliInitial?: number;
  soldeNonEnregistreInitial?: number;
  valeurImmobiliereInitiale?: number;
  soldeHypothecaireInitial?: number;
  tauxHypothecaire?: number;
  amortissementHypothecaireAnnees?: number;
  versementsHypothecairesParAn?: number;
  croissanceSalaire: number;
  inflation: number;
  rendementReer: number;
  rendementCeli: number;
  rendementNonEnregistre: number;
  croissanceImmobiliere: number;
}

export interface PointAccumulation {
  annee: number;
  age: number;
  revenuEmploi: number;
  autresRevenusImposables: number;
  cotisationsSociales: number;
  impotFederal: number;
  impotQuebec: number;
  impotTotal: number;
  revenuNetApresImpot: number;
  depensesAnnuelles: number;
  serviceHypothecaireAnnuel: number;
  cotisationReer: number;
  cotisationCeli: number;
  cotisationNonEnregistree: number;
  epargneTotale: number;
  margeBudgetaire: number;
  soldeReerFin: number;
  soldeCeliFin: number;
  soldeNonEnregistreFin: number;
  valeurImmobiliereFin: number;
  soldeHypothecaireFin: number;
  valeurNetteImmobiliereFin: number;
  valeurNetteTotaleFin: number;
}

export interface ResultatAccumulation {
  anneeRetraite: number;
  ageRetraite: number;
  capitalReerRetraite: number;
  capitalCeliRetraite: number;
  capitalNonEnregistreRetraite: number;
  valeurImmobiliereRetraite: number;
  soldeHypothecaireRetraite: number;
  valeurNetteImmobiliereRetraite: number;
  valeurNetteTotaleRetraite: number;
  points: PointAccumulation[];
}

function determinerEntreeHypothecaire(entree: EntreeAccumulation) {
  const capitalInitial = Math.max(0, entree.soldeHypothecaireInitial ?? 0);
  const tauxNominalAnnuel = Math.max(0, entree.tauxHypothecaire ?? 0);
  const anneesAmortissement = Math.max(
    0,
    entree.amortissementHypothecaireAnnees ?? 0,
  );
  const versementsParAn = Math.max(1, entree.versementsHypothecairesParAn ?? 12);

  if (capitalInitial <= 0 || anneesAmortissement <= 0) {
    return null;
  }

  return {
    capitalInitial,
    tauxNominalAnnuel,
    anneesAmortissement,
    versementsParAn,
  };
}

/**
 * Projection annuelle d'accumulation jusqu'au début de la retraite.
 */
export function projeterAccumulationJusquaRetraite(
  entree: EntreeAccumulation,
): ResultatAccumulation {
  const { profil } = entree;
  const entreeHypothecaire = determinerEntreeHypothecaire(entree);

  if (profil.ageRetraite <= profil.ageActuel) {
    throw new Error("L'âge de retraite doit être supérieur à l'âge actuel.");
  }

  const nombreAnneesProjection = profil.ageRetraite - profil.ageActuel;
  const autresRevenusImposables = Math.max(0, entree.autresRevenusImposables ?? 0);
  const cotisationReer = Math.max(0, entree.cotisationReerAnnuelle ?? 0);
  const cotisationCeli = Math.max(0, entree.cotisationCeliAnnuelle ?? 0);
  const cotisationNonEnregistree = Math.max(
    0,
    entree.cotisationNonEnregistreeAnnuelle ?? 0,
  );
  const epargneTotale = cotisationReer + cotisationCeli + cotisationNonEnregistree;
  const lignesHypotheque = entreeHypothecaire
    ? calculerTableauAmortissementHypothecaireCanadien(entreeHypothecaire)
    : [];
  const versementsParAn = Math.max(1, entree.versementsHypothecairesParAn ?? 12);
  const points: PointAccumulation[] = [];
  let revenuEmploi = Math.max(0, entree.revenuEmploiActuel);
  let depensesAnnuelles = Math.max(0, entree.depensesAnnuellesActuelles ?? 0);
  let soldeReer = Math.max(0, entree.soldeReerInitial ?? 0);
  let soldeCeli = Math.max(0, entree.soldeCeliInitial ?? 0);
  let soldeNonEnregistre = Math.max(0, entree.soldeNonEnregistreInitial ?? 0);
  let valeurImmobiliere = Math.max(0, entree.valeurImmobiliereInitiale ?? 0);

  for (let index = 0; index < nombreAnneesProjection; index += 1) {
    const annee = entree.anneeCourante + index;
    const age = profil.ageActuel + index;
    const cotisations = calculerCotisationsSociales2025({
      revenuTravail: revenuEmploi,
    });
    const impotFederal = calculerImpotFederal2025({
      revenuEmploi: revenuEmploi + autresRevenusImposables,
      deductionREER: cotisationReer,
      resideAuQuebec: profil.provinceResidence === "QC",
      cotisationsSociales: cotisations,
    });
    const impotQuebec = calculerImpotQuebec2025({
      revenuEmploi: revenuEmploi + autresRevenusImposables,
      deductionREER: cotisationReer,
      cotisationsSociales: cotisations,
    });
    const impotTotal = impotFederal.impotNet + impotQuebec.impotNet;
    const revenuNetApresImpot =
      revenuEmploi + autresRevenusImposables - impotTotal - cotisations.totalPersonnel;
    const debutPeriodeVersement = index * versementsParAn;
    const finPeriodeVersementExclusive = (index + 1) * versementsParAn;
    const lignesAnnuellesHypotheque = lignesHypotheque.slice(
      debutPeriodeVersement,
      finPeriodeVersementExclusive,
    );
    const serviceHypothecaireAnnuel = arrondir2(
      lignesAnnuellesHypotheque.reduce((total, ligne) => total + ligne.paiement, 0),
    );
    const derniereLigneHypothecaire =
      lignesAnnuellesHypotheque[lignesAnnuellesHypotheque.length - 1];
    const soldeHypothecaireFin =
      lignesAnnuellesHypotheque.length > 0 && derniereLigneHypothecaire
        ? derniereLigneHypothecaire.soldeApresVersement
        : 0;
    const croissanceReer = soldeReer * entree.rendementReer;
    const croissanceCeli = soldeCeli * entree.rendementCeli;
    const croissanceNonEnregistre = soldeNonEnregistre * entree.rendementNonEnregistre;

    soldeReer = soldeReer + croissanceReer + cotisationReer;
    soldeCeli = soldeCeli + croissanceCeli + cotisationCeli;
    soldeNonEnregistre =
      soldeNonEnregistre + croissanceNonEnregistre + cotisationNonEnregistree;
    valeurImmobiliere = valeurImmobiliere * (1 + entree.croissanceImmobiliere);

    const margeBudgetaire =
      revenuNetApresImpot - depensesAnnuelles - serviceHypothecaireAnnuel - epargneTotale;
    const valeurNetteImmobiliereFin = valeurImmobiliere - soldeHypothecaireFin;
    const valeurNetteTotaleFin =
      soldeReer + soldeCeli + soldeNonEnregistre + valeurNetteImmobiliereFin;

    points.push({
      annee,
      age,
      revenuEmploi: arrondir2(revenuEmploi),
      autresRevenusImposables: arrondir2(autresRevenusImposables),
      cotisationsSociales: cotisations.totalPersonnel,
      impotFederal: impotFederal.impotNet,
      impotQuebec: impotQuebec.impotNet,
      impotTotal: arrondir2(impotTotal),
      revenuNetApresImpot: arrondir2(revenuNetApresImpot),
      depensesAnnuelles: arrondir2(depensesAnnuelles),
      serviceHypothecaireAnnuel,
      cotisationReer: arrondir2(cotisationReer),
      cotisationCeli: arrondir2(cotisationCeli),
      cotisationNonEnregistree: arrondir2(cotisationNonEnregistree),
      epargneTotale: arrondir2(epargneTotale),
      margeBudgetaire: arrondir2(margeBudgetaire),
      soldeReerFin: arrondir2(soldeReer),
      soldeCeliFin: arrondir2(soldeCeli),
      soldeNonEnregistreFin: arrondir2(soldeNonEnregistre),
      valeurImmobiliereFin: arrondir2(valeurImmobiliere),
      soldeHypothecaireFin: arrondir2(soldeHypothecaireFin),
      valeurNetteImmobiliereFin: arrondir2(valeurNetteImmobiliereFin),
      valeurNetteTotaleFin: arrondir2(valeurNetteTotaleFin),
    });

    revenuEmploi *= 1 + entree.croissanceSalaire;
    depensesAnnuelles *= 1 + entree.inflation;
  }

  const dernierPoint = points[points.length - 1];

  return {
    anneeRetraite: entree.anneeCourante + nombreAnneesProjection,
    ageRetraite: profil.ageRetraite,
    capitalReerRetraite: dernierPoint?.soldeReerFin ?? 0,
    capitalCeliRetraite: dernierPoint?.soldeCeliFin ?? 0,
    capitalNonEnregistreRetraite: dernierPoint?.soldeNonEnregistreFin ?? 0,
    valeurImmobiliereRetraite: dernierPoint?.valeurImmobiliereFin ?? 0,
    soldeHypothecaireRetraite: dernierPoint?.soldeHypothecaireFin ?? 0,
    valeurNetteImmobiliereRetraite: dernierPoint?.valeurNetteImmobiliereFin ?? 0,
    valeurNetteTotaleRetraite: dernierPoint?.valeurNetteTotaleFin ?? 0,
    points,
  };
}
