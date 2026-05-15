import { donneesFiscales2025 } from "../../data/tax-2025";
import type { CotisationsSociales2025, StatutTravail } from "../types";
import { arrondir2 } from "./shared";

export interface EntreeCotisationsTravail {
  revenuTravail: number;
  statut?: StatutTravail;
  participerAETravailleurAutonome?: boolean;
}

/**
 * Calcule les cotisations RRQ, RQAP et AE 2025 pour un resident du Quebec.
 *
 * Sources :
 * - Retraite Quebec, cotisations RRQ 2025
 * - RQAP, taux 2025
 * - CRA, primes AE 2025 pour le Quebec
 * - Verification manuelle effectuee le 2026-05-10
 *
 * Limites actuelles :
 * - Le module cible d'abord le cas standard Quebec.
 * - L'AE des travailleurs autonomes est optionnelle et simplifiee.
 */
export function calculerCotisationsSociales2025(
  entree: EntreeCotisationsTravail,
): CotisationsSociales2025 {
  const statut = entree.statut ?? "salarie";
  const revenuTravail = Math.max(0, entree.revenuTravail);
  const { rrq, rqap, assuranceEmploiQuebec } = donneesFiscales2025.cotisations;

  const revenuCotisableSousMGA = Math.max(
    0,
    Math.min(revenuTravail, rrq.mga) - rrq.exemptionGenerale,
  );
  const revenuCotisableRRQ2 = Math.max(0, Math.min(revenuTravail, rrq.msga) - rrq.mga);

  const rrqBaseEmploye = revenuCotisableSousMGA * rrq.tauxBaseEmploye;
  const rrqSupp1Employe = revenuCotisableSousMGA * rrq.tauxSupplementaire1Employe;
  const rrqSupp2Employe = revenuCotisableRRQ2 * rrq.tauxSupplementaire2Employe;

  const multiplicateurRRQ = statut === "autonome" ? 2 : 1;
  const rrqBase = rrqBaseEmploye * multiplicateurRRQ;
  const rrqSupplementaire1 = rrqSupp1Employe * multiplicateurRRQ;
  const rrqSupplementaire2 = rrqSupp2Employe * multiplicateurRRQ;

  const rqapTaux =
    statut === "autonome" ? rqap.tauxTravailleurAutonome : rqap.tauxEmploye;
  const rqapMontant =
    Math.min(revenuTravail, rqap.maximumRevenuAssurable) * rqapTaux;

  const assuranceEmploiMontant =
    statut === "autonome" && !entree.participerAETravailleurAutonome
      ? 0
      : Math.min(revenuTravail, assuranceEmploiQuebec.maximumRevenuAssurable) *
        assuranceEmploiQuebec.tauxEmploye;

  let montantCreditFederal = rrqBaseEmploye + rqapMontant;
  let montantDeductibleFederal = rrqSupp1Employe + rrqSupp2Employe;

  if (statut === "salarie") {
    montantCreditFederal += assuranceEmploiMontant;
  } else {
    montantDeductibleFederal += rrqBaseEmploye + rrqSupp1Employe + rrqSupp2Employe;
  }

  return {
    revenuTravail,
    statut,
    rrqBase: arrondir2(rrqBase),
    rrqSupplementaire1: arrondir2(rrqSupplementaire1),
    rrqSupplementaire2: arrondir2(rrqSupplementaire2),
    rqap: arrondir2(rqapMontant),
    assuranceEmploi: arrondir2(assuranceEmploiMontant),
    totalPersonnel: arrondir2(
      rrqBase + rrqSupplementaire1 + rrqSupplementaire2 + rqapMontant + assuranceEmploiMontant,
    ),
    totalEmployeur:
      statut === "salarie"
        ? arrondir2(rrqBase + rrqSupplementaire1 + rrqSupplementaire2 + rqapMontant)
        : 0,
    montantCreditFederal: arrondir2(montantCreditFederal),
    montantDeductibleFederal: arrondir2(montantDeductibleFederal),
    montantDeductibleQuebec: arrondir2(montantDeductibleFederal),
  };
}
