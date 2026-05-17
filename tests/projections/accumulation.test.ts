import { describe, expect, it } from "vitest";
import { projeterAccumulationJusquaRetraite } from "../../src/engine/projections/accumulation";
import { simulerDecaissementDepuisAccumulation } from "../../src/engine/projections/decumulation";

describe("projeterAccumulationJusquaRetraite", () => {
  it("projette les annees calendaires et les ages jusqu'au debut de la retraite", () => {
    const resultat = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 40,
        anneeNaissance: 1986,
        ageRetraite: 43,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      depensesAnnuellesActuelles: 0,
      cotisationReerAnnuelle: 1000,
      cotisationCeliAnnuelle: 2000,
      cotisationNonEnregistreeAnnuelle: 3000,
      croissanceSalaire: 0,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    expect(resultat.points).toHaveLength(3);
    expect(resultat.points[0]).toMatchObject({ annee: 2026, age: 40 });
    expect(resultat.points[2]).toMatchObject({ annee: 2028, age: 42 });
    expect(resultat.anneeRetraite).toBe(2029);
    expect(resultat.ageRetraite).toBe(43);
    expect(resultat.capitalReerRetraite).toBe(3000);
    expect(resultat.capitalCeliRetraite).toBe(6000);
    expect(resultat.capitalNonEnregistreRetraite).toBe(9000);
  });

  it("fait demarrer le decaissement exactement avec les soldes calcules", () => {
    const accumulation = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 60,
        anneeNaissance: 1966,
        ageRetraite: 61,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      depensesAnnuellesActuelles: 0,
      soldeReerInitial: 100000,
      soldeCeliInitial: 50000,
      soldeNonEnregistreInitial: 25000,
      cotisationReerAnnuelle: 0,
      cotisationCeliAnnuelle: 0,
      cotisationNonEnregistreeAnnuelle: 0,
      croissanceSalaire: 0,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    const decaissement = simulerDecaissementDepuisAccumulation(accumulation, {
      retraitAnnuelCibleInitial: 10000,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      indexationRetrait: 0,
      nombreAnnees: 1,
    });

    expect(decaissement.capitalInitialTotal).toBe(175000);
    expect(decaissement.points[0]).toMatchObject({
      annee: 2027,
      age: 61,
      soldeReerDebut: 100000,
      soldeCeliDebut: 50000,
      soldeNonEnregistreDebut: 25000,
      retraitNonEnregistre: 10000,
      retraitReer: 0,
      retraitCeli: 0,
    });
  });

  it("indexe la cotisation REER au meme rythme que la croissance salariale", () => {
    const resultat = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 40,
        anneeNaissance: 1986,
        ageRetraite: 42,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      depensesAnnuellesActuelles: 0,
      cotisationReerAnnuelle: 1000,
      cotisationCeliAnnuelle: 0,
      cotisationNonEnregistreeAnnuelle: 0,
      croissanceSalaire: 0.1,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    expect(resultat.points[0]?.cotisationReer).toBe(1000);
    expect(resultat.points[1]?.cotisationReer).toBe(1100);
    expect(resultat.capitalReerRetraite).toBe(2100);
  });

  it("retient seulement la quote-part de l'utilisateur pour l'immobilier et l'hypotheque", () => {
    const resultat = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 40,
        anneeNaissance: 1986,
        ageRetraite: 41,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      depensesAnnuellesActuelles: 0,
      valeurImmobiliereInitiale: 600000,
      soldeHypothecaireInitial: 200000,
      partUtilisateurImmobilier: 0.5,
      cotisationReerAnnuelle: 0,
      cotisationCeliAnnuelle: 0,
      cotisationNonEnregistreeAnnuelle: 0,
      croissanceSalaire: 0,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    expect(resultat.valeurImmobiliereRetraite).toBe(300000);
    expect(resultat.soldeHypothecaireRetraite).toBe(0);
    expect(resultat.valeurNetteImmobiliereRetraite).toBe(300000);
  });

  it("peut indexer les dividendes annuels dans la projection", () => {
    const resultat = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 40,
        anneeNaissance: 1986,
        ageRetraite: 42,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      dividendesTrimestrielsActuels: 100,
      croissanceDividendes: 0.1,
      depensesAnnuellesActuelles: 0,
      cotisationReerAnnuelle: 0,
      cotisationCeliAnnuelle: 0,
      cotisationNonEnregistreeAnnuelle: 0,
      croissanceSalaire: 0,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    expect(resultat.points[0]?.dividendesAnnuels).toBe(400);
    expect(resultat.points[1]?.dividendesAnnuels).toBe(440);
  });

  it("reduit les depenses futures apres la fin de l'hypotheque", () => {
    const resultat = projeterAccumulationJusquaRetraite({
      profil: {
        ageActuel: 40,
        anneeNaissance: 1986,
        ageRetraite: 42,
        esperanceVie: 95,
        provinceResidence: "QC",
        statutMarital: "celibataire",
      },
      anneeCourante: 2026,
      revenuEmploiActuel: 0,
      depensesAnnuellesActuelles: 1000,
      partDepensesLogementApresHypotheque: 0.25,
      soldeHypothecaireInitial: 1200,
      tauxHypothecaire: 0,
      amortissementHypothecaireAnnees: 1,
      versementsHypothecairesParAn: 12,
      cotisationReerAnnuelle: 0,
      cotisationCeliAnnuelle: 0,
      cotisationNonEnregistreeAnnuelle: 0,
      croissanceSalaire: 0,
      inflation: 0,
      rendementReer: 0,
      rendementCeli: 0,
      rendementNonEnregistre: 0,
      croissanceImmobiliere: 0,
    });

    expect(resultat.points[0]?.depensesAnnuelles).toBe(1000);
    expect(resultat.depensesProjeteesRetraite).toBe(750);
  });
});
