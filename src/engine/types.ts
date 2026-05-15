export type StatutTravail = "salarie" | "autonome";

export interface CotisationsSociales2025 {
  revenuTravail: number;
  statut: StatutTravail;
  rrqBase: number;
  rrqSupplementaire1: number;
  rrqSupplementaire2: number;
  rqap: number;
  assuranceEmploi: number;
  totalPersonnel: number;
  totalEmployeur: number;
  montantCreditFederal: number;
  montantDeductibleFederal: number;
  montantDeductibleQuebec: number;
}

export interface EntreeImpotSimple2025 {
  revenuEmploi: number;
  deductionREER?: number;
  revenuPensionAdmissible?: number;
  age?: number;
  resideAuQuebec?: boolean;
  cotisationsSociales?: CotisationsSociales2025;
}

export interface ResultatImpot2025 {
  revenuNet: number;
  revenuImposable: number;
  impotBrut: number;
  credits: number;
  impotNet: number;
}
