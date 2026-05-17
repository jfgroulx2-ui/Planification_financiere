export interface EntreeScorePreparationRetraite {
  objectifNetAnnuel: number;
  netDisponiblePremiereAnnee: number;
  revenuGarantiPremiereAnnee: number;
  capitalInitialTotal: number;
  capitalFinalTotal: number;
  nombreAnneesProjection: number;
  nombreAnneesSoutenues: number;
}

export interface ResultatScorePreparationRetraite {
  scoreGlobal: 1 | 2 | 3 | 4 | 5;
  libelle: string;
  couleurHex: string;
  commentaireConseiller: string;
  tauxCouvertureRevenu: number;
  partRevenuGaranti: number;
  ratioCapitalFinal: number;
  scoreCouverture: 1 | 2 | 3 | 4 | 5;
  scoreRevenuGaranti: 1 | 2 | 3 | 4 | 5;
  scoreDurabilite: 1 | 2 | 3 | 4 | 5;
}

function arrondir2(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

function bornerScore(valeur: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(valeur))) as 1 | 2 | 3 | 4 | 5;
}

function scoreCouvertureRevenu(tauxCouvertureRevenu: number): 1 | 2 | 3 | 4 | 5 {
  if (tauxCouvertureRevenu >= 110) {
    return 5;
  }

  if (tauxCouvertureRevenu >= 100) {
    return 4;
  }

  if (tauxCouvertureRevenu >= 85) {
    return 3;
  }

  if (tauxCouvertureRevenu >= 70) {
    return 2;
  }

  return 1;
}

function scoreRevenuGaranti(partRevenuGaranti: number): 1 | 2 | 3 | 4 | 5 {
  if (partRevenuGaranti >= 50) {
    return 5;
  }

  if (partRevenuGaranti >= 40) {
    return 4;
  }

  if (partRevenuGaranti >= 30) {
    return 3;
  }

  if (partRevenuGaranti >= 20) {
    return 2;
  }

  return 1;
}

function scoreDurabilite(
  ratioHorizonSoutenu: number,
  ratioCapitalFinal: number,
): 1 | 2 | 3 | 4 | 5 {
  if (ratioHorizonSoutenu >= 1 && ratioCapitalFinal >= 25) {
    return 5;
  }

  if (ratioHorizonSoutenu >= 1) {
    return 4;
  }

  if (ratioHorizonSoutenu >= 0.85) {
    return 3;
  }

  if (ratioHorizonSoutenu >= 0.7) {
    return 2;
  }

  return 1;
}

function decrireScoreGlobal(scoreGlobal: 1 | 2 | 3 | 4 | 5): Pick<
  ResultatScorePreparationRetraite,
  "libelle" | "couleurHex" | "commentaireConseiller"
> {
  switch (scoreGlobal) {
    case 5:
      return {
        libelle: "Très solide",
        couleurHex: "#2D7A5F",
        commentaireConseiller:
          "Le revenu projeté couvre bien l'objectif visé et le capital conserve une marge appréciable. Le plan de retraite paraît robuste selon les hypothèses actuelles.",
      };
    case 4:
      return {
        libelle: "Solide",
        couleurHex: "#5C9968",
        commentaireConseiller:
          "Le scénario est cohérent et soutenable, mais la marge de sécurité demeure plus modeste. Une révision périodique des hypothèses restera importante.",
      };
    case 3:
      return {
        libelle: "Acceptable",
        couleurHex: "#C9A961",
        commentaireConseiller:
          "Le plan tient globalement, mais avec une marge limitée. Une baisse de revenu variable, un rendement plus faible ou des dépenses plus élevées pourraient fragiliser la retraite.",
      };
    case 2:
      return {
        libelle: "Fragile",
        couleurHex: "#C97B3F",
        commentaireConseiller:
          "Le revenu projeté ou la durabilité du capital semblent insuffisants pour offrir un confort stable. Il serait prudent d'ajuster l'épargne, l'âge de retraite ou l'objectif de décaissement.",
      };
    default:
      return {
        libelle: "Préoccupant",
        couleurHex: "#A04545",
        commentaireConseiller:
          "Le plan de retraite montre un écart important entre les besoins visés et les ressources projetées. Une refonte plus profonde de la stratégie est recommandée.",
      };
  }
}

/**
 * Produit un second score orienté retraite.
 *
 * Ce score complète le score d'épargne en se rapprochant davantage d'une
 * lecture de planification financière : couverture du revenu cible,
 * importance du revenu garanti et durabilité du capital.
 */
export function evaluerPreparationRetraite(
  entree: EntreeScorePreparationRetraite,
): ResultatScorePreparationRetraite {
  const objectifNetAnnuel = Math.max(0, entree.objectifNetAnnuel);
  const netDisponiblePremiereAnnee = Math.max(0, entree.netDisponiblePremiereAnnee);
  const revenuGarantiPremiereAnnee = Math.max(0, entree.revenuGarantiPremiereAnnee);
  const capitalInitialTotal = Math.max(0, entree.capitalInitialTotal);
  const capitalFinalTotal = Math.max(0, entree.capitalFinalTotal);
  const nombreAnneesProjection = Math.max(1, entree.nombreAnneesProjection);
  const nombreAnneesSoutenues = Math.max(
    0,
    Math.min(entree.nombreAnneesSoutenues, nombreAnneesProjection),
  );

  const tauxCouvertureRevenu =
    objectifNetAnnuel > 0
      ? arrondir2((netDisponiblePremiereAnnee / objectifNetAnnuel) * 100)
      : 100;
  const partRevenuGaranti =
    objectifNetAnnuel > 0
      ? arrondir2((revenuGarantiPremiereAnnee / objectifNetAnnuel) * 100)
      : 0;
  const ratioCapitalFinal =
    capitalInitialTotal > 0
      ? arrondir2((capitalFinalTotal / capitalInitialTotal) * 100)
      : 0;
  const ratioHorizonSoutenu = nombreAnneesSoutenues / nombreAnneesProjection;

  const scoreCouverture = scoreCouvertureRevenu(tauxCouvertureRevenu);
  const scoreGaranti = scoreRevenuGaranti(partRevenuGaranti);
  const scoreDurable = scoreDurabilite(ratioHorizonSoutenu, ratioCapitalFinal);
  const scoreGlobal = bornerScore(
    (scoreCouverture + scoreGaranti + scoreDurable) / 3,
  );
  const description = decrireScoreGlobal(scoreGlobal);

  return {
    scoreGlobal,
    libelle: description.libelle,
    couleurHex: description.couleurHex,
    commentaireConseiller: description.commentaireConseiller,
    tauxCouvertureRevenu,
    partRevenuGaranti,
    ratioCapitalFinal,
    scoreCouverture,
    scoreRevenuGaranti: scoreGaranti,
    scoreDurabilite: scoreDurable,
  };
}
