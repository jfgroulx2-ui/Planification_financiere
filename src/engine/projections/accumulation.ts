import {
  calculerTableauAmortissementHypothecaireCanadien,
  type EntreeHypotheque,
} from "../mortgage/canadian-amortization";
import { calculerImpotFederal2025 } from "../tax/federal";
import { calculerCotisationsSociales2025 } from "../tax/payroll";
import { calculerImpotQuebec2025 } from "../tax/quebec";
import { arrondir2 } from "../tax/shared";
import type { ProfilUtilisateurMinimal } from "../types";

export interface EntreeAccumulation {
  profil: ProfilUtilisateurMinimal;
  anneeCourante: number;
  revenuEmploiActuel: number;
  bonusAnnuelActuel?: number;
  tauxRealisationBonus?: number;
  autresRevenusImposables?: number;
  dividendesTrimestrielsActuels?: number;
  tauxRealisationDividendes?: number;
  croissanceDividendes?: number;
  depensesAnnuellesActuelles?: number;
  partDepensesLogementApresHypotheque?: number;
  cotisationReerAnnuelle?: number;
  cotisationCeliAnnuelle?: number;
  cotisationNonEnregistreeAnnuelle?: number;
  indexerCotisationReerAvecSalaire?: boolean;
  soldeReerInitial?: number;
  soldeCeliInitial?: number;
  soldeNonEnregistreInitial?: number;
  valeurImmobiliereInitiale?: number;
  partUtilisateurImmobilier?: number;
  soldeHypothecaireInitial?: number;
  coutAcquisitionImmobilier?: number;
  anneeAchatImmobilier?: number;
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
  salaireBase: number;
  bonusAnnuel: number;
  revenuEmploi: number;
  autresRevenusImposables: number;
  dividendesAnnuels: number;
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
  depensesProjeteesRetraite: number;
  serviceHypothecaireRetraiteEstime: number;
  objectifDecaissementSuggereRetraite: number;
  points: PointAccumulation[];
}

function bornerProportion(valeur: number | undefined, defaut = 1): number {
  return Math.min(1, Math.max(0, valeur ?? defaut));
}

function determinerEntreeHypothecaire(
  entree: EntreeAccumulation,
): EntreeHypotheque | null {
  const partUtilisateurImmobilier = bornerProportion(
    entree.partUtilisateurImmobilier,
  );
  const capitalInitial =
    Math.max(0, entree.soldeHypothecaireInitial ?? 0) * partUtilisateurImmobilier;
  const tauxNominalAnnuel = Math.max(0, entree.tauxHypothecaire ?? 0);
  const anneesAmortissement = Math.max(
    0,
    entree.amortissementHypothecaireAnnees ?? 0,
  );
  const versementsParAn = Math.max(1, entree.versementsHypothecairesParAn ?? 12);

  if (capitalInitial <= 0 || anneesAmortissement <= 0 || tauxNominalAnnuel < 0) {
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
 *
 * Hypothèses de travail de cette version :
 * - les tables fiscales 2025 sont réutilisées comme base de projection ;
 * - les cotisations sont versées en fin d'année ;
 * - la croissance des comptes s'applique sur le solde de début d'année ;
 * - le bonus suit la même croissance que le salaire ;
 * - les dividendes trimestriels sont convertis en revenu annuel imposable ;
 * - un taux de réalisation peut être appliqué au boni et aux dividendes
 *   pour modéliser des revenus variables non garantis ;
 * - la part immobilière appliquée représente la quote-part de l'utilisateur
 *   à la fois dans la valeur de la maison et dans l'hypothèque ;
 * - une partie des dépenses peut disparaître une fois l'hypothèque terminée ;
 * - la retraite débute le 1er janvier de l'année suivant la dernière année simulée.
 */
export function projeterAccumulationJusquaRetraite(
  entree: EntreeAccumulation,
): ResultatAccumulation {
  const { profil } = entree;
  const partUtilisateurImmobilier = bornerProportion(
    entree.partUtilisateurImmobilier,
  );
  const entreeHypothecaire = determinerEntreeHypothecaire(entree);

  if (profil.ageRetraite <= profil.ageActuel) {
    throw new Error("L'âge de retraite doit être supérieur à l'âge actuel.");
  }

  const nombreAnneesProjection = profil.ageRetraite - profil.ageActuel;
  const autresRevenusImposablesBase = Math.max(
    0,
    entree.autresRevenusImposables ?? 0,
  );
  const tauxRealisationBonus = bornerProportion(entree.tauxRealisationBonus);
  const tauxRealisationDividendes = bornerProportion(
    entree.tauxRealisationDividendes,
  );
  const croissanceDividendes = entree.croissanceDividendes ?? 0;
  const partDepensesLogementApresHypotheque = bornerProportion(
    entree.partDepensesLogementApresHypotheque,
    0,
  );
  const cotisationCeli = Math.max(0, entree.cotisationCeliAnnuelle ?? 0);
  const cotisationNonEnregistree = Math.max(
    0,
    entree.cotisationNonEnregistreeAnnuelle ?? 0,
  );
  const indexerCotisationReerAvecSalaire =
    entree.indexerCotisationReerAvecSalaire ?? true;
  const lignesHypotheque = entreeHypothecaire
    ? calculerTableauAmortissementHypothecaireCanadien(entreeHypothecaire)
    : [];
  const aUneHypotheque = entreeHypothecaire !== null;
  const versementsParAn = Math.max(1, entree.versementsHypothecairesParAn ?? 12);
  const points: PointAccumulation[] = [];
  let salaireBase = Math.max(0, entree.revenuEmploiActuel);
  let bonusAnnuel =
    Math.max(0, entree.bonusAnnuelActuel ?? 0) * tauxRealisationBonus;
  let dividendesAnnuels =
    Math.max(0, entree.dividendesTrimestrielsActuels ?? 0) *
    4 *
    tauxRealisationDividendes;
  let cotisationReer = Math.max(0, entree.cotisationReerAnnuelle ?? 0);
  let depensesAnnuelles = Math.max(0, entree.depensesAnnuellesActuelles ?? 0);
  let soldeReer = Math.max(0, entree.soldeReerInitial ?? 0);
  let soldeCeli = Math.max(0, entree.soldeCeliInitial ?? 0);
  let soldeNonEnregistre = Math.max(0, entree.soldeNonEnregistreInitial ?? 0);
  let valeurImmobiliere =
    Math.max(0, entree.valeurImmobiliereInitiale ?? 0) * partUtilisateurImmobilier;
  let reductionDepensesAppliquee = false;

  for (let index = 0; index < nombreAnneesProjection; index += 1) {
    const annee = entree.anneeCourante + index;
    const age = profil.ageActuel + index;
    const revenuEmploi = salaireBase + bonusAnnuel;
    const autresRevenusImposables =
      autresRevenusImposablesBase + dividendesAnnuels;
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
      revenuEmploi +
      autresRevenusImposables -
      impotTotal -
      cotisations.totalPersonnel;
    const epargneTotale =
      cotisationReer + cotisationCeli + cotisationNonEnregistree;
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
    const croissanceNonEnregistre =
      soldeNonEnregistre * entree.rendementNonEnregistre;

    soldeReer = soldeReer + croissanceReer + cotisationReer;
    soldeCeli = soldeCeli + croissanceCeli + cotisationCeli;
    soldeNonEnregistre =
      soldeNonEnregistre + croissanceNonEnregistre + cotisationNonEnregistree;
    valeurImmobiliere = valeurImmobiliere * (1 + entree.croissanceImmobiliere);

    const margeBudgetaire =
      revenuNetApresImpot -
      depensesAnnuelles -
      serviceHypothecaireAnnuel -
      epargneTotale;
    const valeurNetteImmobiliereFin = valeurImmobiliere - soldeHypothecaireFin;
    const valeurNetteTotaleFin =
      soldeReer + soldeCeli + soldeNonEnregistre + valeurNetteImmobiliereFin;

    points.push({
      annee,
      age,
      salaireBase: arrondir2(salaireBase),
      bonusAnnuel: arrondir2(bonusAnnuel),
      revenuEmploi: arrondir2(revenuEmploi),
      autresRevenusImposables: arrondir2(autresRevenusImposables),
      dividendesAnnuels: arrondir2(dividendesAnnuels),
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

    salaireBase *= 1 + entree.croissanceSalaire;
    bonusAnnuel *= 1 + entree.croissanceSalaire;

    if (
      aUneHypotheque &&
      !reductionDepensesAppliquee &&
      soldeHypothecaireFin <= 0 &&
      partDepensesLogementApresHypotheque > 0
    ) {
      depensesAnnuelles *= 1 - partDepensesLogementApresHypotheque;
      reductionDepensesAppliquee = true;
    }

    depensesAnnuelles *= 1 + entree.inflation;
    dividendesAnnuels *= 1 + croissanceDividendes;

    if (indexerCotisationReerAvecSalaire) {
      cotisationReer *= 1 + entree.croissanceSalaire;
    }
  }

  const dernierPoint = points[points.length - 1];
  const debutRetraiteVersement = nombreAnneesProjection * versementsParAn;
  const finRetraiteVersementExclusive =
    (nombreAnneesProjection + 1) * versementsParAn;
  const lignesRetraiteHypotheque = lignesHypotheque.slice(
    debutRetraiteVersement,
    finRetraiteVersementExclusive,
  );
  const serviceHypothecaireRetraiteEstime = arrondir2(
    lignesRetraiteHypotheque.reduce((total, ligne) => total + ligne.paiement, 0),
  );
  const depensesProjeteesRetraite = arrondir2(depensesAnnuelles);
  const objectifDecaissementSuggereRetraite = arrondir2(
    depensesProjeteesRetraite + serviceHypothecaireRetraiteEstime,
  );

  return {
    anneeRetraite: entree.anneeCourante + nombreAnneesProjection,
    ageRetraite: profil.ageRetraite,
    capitalReerRetraite: dernierPoint?.soldeReerFin ?? 0,
    capitalCeliRetraite: dernierPoint?.soldeCeliFin ?? 0,
    capitalNonEnregistreRetraite: dernierPoint?.soldeNonEnregistreFin ?? 0,
    valeurImmobiliereRetraite: dernierPoint?.valeurImmobiliereFin ?? 0,
    soldeHypothecaireRetraite: dernierPoint?.soldeHypothecaireFin ?? 0,
    valeurNetteImmobiliereRetraite:
      dernierPoint?.valeurNetteImmobiliereFin ?? 0,
    valeurNetteTotaleRetraite: dernierPoint?.valeurNetteTotaleFin ?? 0,
    depensesProjeteesRetraite,
    serviceHypothecaireRetraiteEstime,
    objectifDecaissementSuggereRetraite,
    points,
  };
}
