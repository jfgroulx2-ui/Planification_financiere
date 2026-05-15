/**
 * Hypotheses de projection 2026.
 *
 * Source principale :
 * - Institut de planification financiere / FP Canada, Normes d'hypotheses de projection 2026
 * - Verification manuelle effectuee le 2026-05-10
 *
 * Note :
 * - Cette structure est volontairement explicite pour permettre des surcharges
 *   scenario par scenario sans toucher aux valeurs normatives par defaut.
 */
export const hypothesesIqpf2026 = {
  anneePublication: 2026,
  source:
    "https://institutpf.org/communique/linstitut-de-planification-financiere-et-fp-canada-et-publient-les-normes-dhypotheses-de-projection-2026",
  dateEntreeEnVigueur: "2026-04-30",
  inflation: 0.021,
  croissanceSalaires: 0.031,
  croissanceMGA: 0.031,
  rendementNominal: {
    courtTerme: 0.024,
    revenuFixeCanadien: 0.032,
    actionsCanadiennes: 0.063,
    actionsAmericaines: 0.064,
    actionsInternationalesDeveloppees: 0.066,
    actionsMarchesEmergents: 0.075,
  },
  fraisGestion: {
    // TODO: integrer la decomposition officielle du document complet / addendum.
    courtTerme: 0.005,
    revenuFixeCanadien: 0.01,
    actionsCanadiennes: 0.01,
    actionsAmericaines: 0.01,
    actionsInternationalesDeveloppees: 0.01,
    actionsMarchesEmergents: 0.0125,
  },
  tauxEmprunt: {
    hypotheseLongTerme: 0.044,
  },
  immobilier: {
    residencePrincipale: 0.031,
    coutLocationResidencePrincipale: 0.031,
  },
} as const;

export type HypothesesIqpf2026 = typeof hypothesesIqpf2026;
