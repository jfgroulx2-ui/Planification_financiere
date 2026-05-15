export interface PalierImposition {
  plafond: number | null;
  taux: number;
}

/**
 * Parametres fiscaux 2025 utilises par les premiers modules du moteur.
 *
 * Sources officielles :
 * - CRA: taux d'impot des particuliers 2025, montant personnel de base 2025,
 *   plafond REER 2025, droits CELI, minimum RRIF, assurance-emploi
 * - Revenu Quebec: tables d'impot 2025 et RQAP
 * - Retraite Quebec: RRQ 2025 (MGA, MSGA, taux)
 *
 * Verification manuelle effectuee le 2026-05-10.
 */
export const donneesFiscales2025 = {
  annee: 2025,
  sources: {
    federal:
      "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
    montantPersonnelBase:
      "https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package/quebec/5005-s1.html",
    quebec:
      "https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration/aide-par-ligne/350-a-398-1-calcul-du-revenu-imposable-et-de-limpot-a-payer/401-a-440-impot-a-payer/",
    rrq:
      "https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime_rentes/cotisation/Pages/cotisation.aspx",
    rqap:
      "https://www.rqap.gouv.qc.ca/fr/a-propos-du-regime/taux-de-cotisation-et-revenu-maximal",
    ae:
      "https://www.canada.ca/en/services/benefits/ei/ei-premiums.html",
    reer:
      "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributions/contributions-affect-your-rrsp-pr-limit.html",
    celi:
      "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html",
  },
  federal: {
    tauxCreditNonRemboursable: 0.145,
    abattementQuebec: 0.165,
    paliers: [
      { plafond: 57375, taux: 0.145 },
      { plafond: 114750, taux: 0.205 },
      { plafond: 177882, taux: 0.26 },
      { plafond: 253414, taux: 0.29 },
      { plafond: null, taux: 0.33 },
    ] satisfies PalierImposition[],
    montantPersonnelBase: {
      maximum: 16129,
      minimum: 14538,
      seuilReductionDebut: 177882,
      seuilReductionFin: 253414,
    },
    montantPension: 2000,
    dividendes: {
      admissibles: {
        majoration: 0.38,
        tauxCredit: 0.150198,
      },
      ordinaires: {
        majoration: 0.15,
        tauxCredit: 0.090301,
      },
    },
    gainsCapital: {
      tauxInclusion: 0.5,
    },
  },
  quebec: {
    tauxCreditNonRemboursable: 0.14,
    paliers: [
      { plafond: 53255, taux: 0.14 },
      { plafond: 106495, taux: 0.19 },
      { plafond: 129590, taux: 0.24 },
      { plafond: null, taux: 0.2575 },
    ] satisfies PalierImposition[],
    montantPersonnelBase: 18571,
  },
  cotisations: {
    rrq: {
      exemptionGenerale: 3500,
      mga: 71300,
      msga: 81200,
      tauxBaseEmploye: 0.054,
      tauxSupplementaire1Employe: 0.01,
      tauxSupplementaire2Employe: 0.04,
    },
    rqap: {
      maximumRevenuAssurable: 98000,
      tauxEmploye: 0.00494,
      tauxTravailleurAutonome: 0.00878,
    },
    assuranceEmploiQuebec: {
      maximumRevenuAssurable: 65700,
      tauxEmploye: 0.0131,
    },
  },
  reer: {
    tauxAccumulation: 0.18,
    plafondNouveauxDroits: 32490,
  },
  celi: {
    plafondAnnuel: {
      2009: 5000,
      2010: 5000,
      2011: 5000,
      2012: 5000,
      2013: 5500,
      2014: 5500,
      2015: 10000,
      2016: 5500,
      2017: 5500,
      2018: 5500,
      2019: 6000,
      2020: 6000,
      2021: 6000,
      2022: 6000,
      2023: 6500,
      2024: 7000,
      2025: 7000,
      2026: 7000,
    } as Record<number, number>,
  },
} as const;
