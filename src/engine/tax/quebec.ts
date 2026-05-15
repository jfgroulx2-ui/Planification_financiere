import { donneesFiscales2025 } from "../../data/tax-2025";
import type { EntreeImpotSimple2025, ResultatImpot2025 } from "../types";
import { arrondir2, calculerImpotProgressif } from "./shared";

/**
 * Calcule l'impot du Quebec 2025 pour un cas simple de revenu d'emploi.
 *
 * Sources :
 * - Revenu Quebec, tables d'impot 2025 pour particuliers
 * - Verification manuelle effectuee le 2026-05-10
 *
 * Limite explicite :
 * - Cette V1 applique uniquement le montant personnel de base comme credit
 *   quebecois general.
 * - Les credits detailes supplementaires seront ajoutes dans une passe
 *   ulterieure plutot que d'etre approximes.
 */
export function calculerImpotQuebec2025(
  entree: EntreeImpotSimple2025,
): ResultatImpot2025 {
  const deductionREER = Math.max(0, entree.deductionREER ?? 0);
  const revenuEmploi = Math.max(0, entree.revenuEmploi);
  const deductionSociale = entree.cotisationsSociales?.montantDeductibleQuebec ?? 0;
  const revenuNet = Math.max(0, revenuEmploi - deductionREER - deductionSociale);
  const revenuImposable = revenuNet;

  const impotBrut = calculerImpotProgressif(
    revenuImposable,
    donneesFiscales2025.quebec.paliers,
  );
  const credits = arrondir2(
    donneesFiscales2025.quebec.montantPersonnelBase *
      donneesFiscales2025.quebec.tauxCreditNonRemboursable,
  );

  return {
    revenuNet: arrondir2(revenuNet),
    revenuImposable: arrondir2(revenuImposable),
    impotBrut,
    credits,
    impotNet: arrondir2(Math.max(0, impotBrut - credits)),
  };
}
