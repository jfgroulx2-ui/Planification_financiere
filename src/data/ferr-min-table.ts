/**
 * Facteurs minimums FERR / RRIF officiels apres les modifications de 2015.
 *
 * Source :
 * - CRA, "Retrait minimum d'un FERR"
 * - Verification manuelle effectuee le 2026-05-10
 */
export const tableRetraitMinimumFERR = {
  71: 0.0528,
  72: 0.054,
  73: 0.0553,
  74: 0.0567,
  75: 0.0582,
  76: 0.0598,
  77: 0.0617,
  78: 0.0636,
  79: 0.0658,
  80: 0.0682,
  81: 0.0708,
  82: 0.0738,
  83: 0.0771,
  84: 0.0808,
  85: 0.0851,
  86: 0.0899,
  87: 0.0955,
  88: 0.1021,
  89: 0.1099,
  90: 0.1192,
  91: 0.1306,
  92: 0.1449,
  93: 0.1634,
  94: 0.1879,
  95: 0.2,
} as const;

export function obtenirFacteurRetraitMinimumFERR(age: number): number {
  if (age <= 70) {
    return 1 / (90 - age);
  }

  if (age >= 95) {
    return tableRetraitMinimumFERR[95];
  }

  return tableRetraitMinimumFERR[age as keyof typeof tableRetraitMinimumFERR];
}
