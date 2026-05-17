import { describe, expect, it } from "vitest";
import {
  simulerDecaissementAnnuel,
  simulerDecaissementRetraite,
} from "../../src/engine/projections/decumulation";

describe("simulerDecaissementAnnuel", () => {
  it("conserve un capital positif quand le retrait est soutenable", () => {
    const resultat = simulerDecaissementAnnuel({
      capitalInitial: 1000000,
      retraitAnnuelInitial: 40000,
      rendementAnnuel: 0.05,
      indexationRetrait: 0.02,
      nombreAnnees: 30,
    });

    expect(resultat.capitalEpuise).toBe(false);
    expect(resultat.capitalFinal).toBeGreaterThan(0);
    expect(resultat.points).toHaveLength(30);
  });

  it("detecte l'epuisement du capital si les retraits sont trop eleves", () => {
    const resultat = simulerDecaissementAnnuel({
      capitalInitial: 300000,
      retraitAnnuelInitial: 80000,
      rendementAnnuel: 0.03,
      indexationRetrait: 0.02,
      nombreAnnees: 15,
    });

    expect(resultat.capitalEpuise).toBe(true);
    expect(resultat.anneeEpuisement).not.toBeNull();
    expect(resultat.capitalFinal).toBe(0);
  });

  it("inclut RRQ et PSV dans le tableau de retraite", () => {
    const resultat = simulerDecaissementRetraite({
      anneeDebut: 2035,
      ageDebut: 64,
      soldeReerInitial: 100000,
      soldeCeliInitial: 50000,
      soldeNonEnregistreInitial: 20000,
      retraitAnnuelCibleInitial: 30000,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      indexationRetrait: 0,
      nombreAnnees: 3,
      ageDebutRrq: 65,
      ageDebutPsv: 65,
    });

    expect(resultat.points[0]).toMatchObject({
      annee: 2035,
      age: 64,
      rrq: 0,
      psv: 0,
    });
    expect(resultat.points[1]?.rrq).toBeGreaterThan(0);
    expect(resultat.points[1]?.psv).toBeGreaterThan(0);
    expect(resultat.points[1]?.netDisponible).toBeGreaterThan(
      resultat.points[1]?.retraitTotalBrut ?? 0,
    );
  });

  it("ajoute le produit net de la vente de la maison au non enregistre", () => {
    const resultat = simulerDecaissementRetraite({
      anneeDebut: 2035,
      ageDebut: 65,
      soldeReerInitial: 0,
      soldeCeliInitial: 0,
      soldeNonEnregistreInitial: 10000,
      valeurImmobiliereInitiale: 300000,
      soldeHypothecaireInitial: 50000,
      croissanceImmobiliere: 0,
      ageVenteMaison: 66,
      retraitAnnuelCibleInitial: 0,
      objectifNetAnnuel: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      indexationRetrait: 0,
      nombreAnnees: 3,
      ageDebutRrq: 65,
      ageDebutPsv: 65,
    });

    expect(resultat.points[0]?.venteMaison).toBe(0);
    expect(resultat.points[1]?.venteMaison).toBe(250000);
    expect(resultat.points[1]?.soldeNonEnregistreDebut).toBeGreaterThanOrEqual(
      260000,
    );
  });

  it("traite le retrait REER comme un revenu imposable", () => {
    const resultat = simulerDecaissementRetraite({
      anneeDebut: 2035,
      ageDebut: 60,
      soldeReerInitial: 20000,
      soldeCeliInitial: 0,
      soldeNonEnregistreInitial: 0,
      retraitAnnuelCibleInitial: 10000,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      indexationRetrait: 0,
      nombreAnnees: 1,
      ageDebutRrq: 65,
      ageDebutPsv: 65,
    });

    expect(resultat.points[0]?.retraitReer).toBe(10000);
    expect(resultat.points[0]?.revenuImposableTotal).toBe(10000);
    expect(resultat.points[0]?.impotTotal).toBeGreaterThan(0);
  });
});
