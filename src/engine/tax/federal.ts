import { donneesFiscales2025 } from "../../data/tax-2025";
import type { EntreeImpotSimple2025, ResultatImpot2025 } from "../types";
import { arrondir2, calculerImpotProgressif, calculerMontantDecroissant } from "./shared";

/**
 * Calcule l'impot federal net 2025 pour un cas simple de resident du Quebec.
 *
 * Sources :
 * - CRA, taux d'impot des particuliers 2025
 * - CRA, Schedule 1 et montant personnel de base 2025
 * - Verification manuelle effectuee le 2026-05-10
 *
 * Portee actuelle :
 * - revenu d'emploi ;
 * - deduction REER ;
 * - credit pour montant personnel de base ;
 * - credit pour revenu de pension admissible ;
 * - credits lies aux cotisations sociales deja calculees ;
 * - abattement du Quebec.
 */
export function calculerImpotFederal2025(
  entree: EntreeImpotSimple2025,
): ResultatImpot2025 {
  const deductionREER = Math.max(0, entree.deductionREER ?? 0);
  const revenuEmploi = Math.max(0, entree.revenuEmploi);
  const deductionSociale = entree.cotisationsSociales?.montantDeductibleFederal ?? 0;
  const revenuNet = Math.max(0, revenuEmploi - deductionREER - deductionSociale);
  const revenuImposable = revenuNet;

  const impotBrutAvantAbattement = calculerImpotProgressif(
    revenuImposable,
    donneesFiscales2025.federal.paliers,
  );
  const impotBrut =
    entree.resideAuQuebec === false
      ? impotBrutAvantAbattement
      : arrondir2(
          impotBrutAvantAbattement *
            (1 - donneesFiscales2025.federal.abattementQuebec),
        );

  const montantPersonnelBase = calculerMontantDecroissant(
    donneesFiscales2025.federal.montantPersonnelBase.maximum,
    donneesFiscales2025.federal.montantPersonnelBase.minimum,
    revenuNet,
    donneesFiscales2025.federal.montantPersonnelBase.seuilReductionDebut,
    donneesFiscales2025.federal.montantPersonnelBase.seuilReductionFin,
  );
  const montantPension = Math.min(
    donneesFiscales2025.federal.montantPension,
    Math.max(0, entree.revenuPensionAdmissible ?? 0),
  );
  const montantCreditCotisations = entree.cotisationsSociales?.montantCreditFederal ?? 0;
  const credits = arrondir2(
    (montantPersonnelBase + montantPension + montantCreditCotisations) *
      donneesFiscales2025.federal.tauxCreditNonRemboursable,
  );

  return {
    revenuNet: arrondir2(revenuNet),
    revenuImposable: arrondir2(revenuImposable),
    impotBrut,
    credits,
    impotNet: arrondir2(Math.max(0, impotBrut - credits)),
  };
}
