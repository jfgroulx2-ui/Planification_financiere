import { describe, expect, it } from "vitest";
import { evaluerPreparationRetraite } from "../../src/engine/savings-score/retirement-readiness";

describe("evaluerPreparationRetraite", () => {
  it("attribue un score fort quand le revenu cible est couvert et le capital dure", () => {
    const resultat = evaluerPreparationRetraite({
      objectifNetAnnuel: 60000,
      netDisponiblePremiereAnnee: 66000,
      revenuGarantiPremiereAnnee: 30000,
      capitalInitialTotal: 1000000,
      capitalFinalTotal: 400000,
      nombreAnneesProjection: 30,
      nombreAnneesSoutenues: 30,
    });

    expect(resultat.scoreGlobal).toBe(5);
    expect(resultat.scoreCouverture).toBe(5);
    expect(resultat.scoreRevenuGaranti).toBe(5);
    expect(resultat.scoreDurabilite).toBe(5);
  });

  it("dégrade le score quand le revenu cible n'est pas couvert", () => {
    const resultat = evaluerPreparationRetraite({
      objectifNetAnnuel: 60000,
      netDisponiblePremiereAnnee: 42000,
      revenuGarantiPremiereAnnee: 12000,
      capitalInitialTotal: 700000,
      capitalFinalTotal: 0,
      nombreAnneesProjection: 30,
      nombreAnneesSoutenues: 18,
    });

    expect(resultat.scoreGlobal).toBeLessThanOrEqual(2);
    expect(resultat.scoreCouverture).toBe(2);
    expect(resultat.scoreRevenuGaranti).toBe(1);
    expect(resultat.scoreDurabilite).toBe(1);
  });
});
