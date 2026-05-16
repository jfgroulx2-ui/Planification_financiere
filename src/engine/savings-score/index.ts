export interface EntreeScoreEpargne {
  revenuBrutAnnuel: number;
  cotisationReer?: number;
  cotisationCeli?: number;
  epargneNonEnregistree?: number;
}

export interface ResultatScoreEpargne {
  tauxEpargne: number;
  score: 1 | 2 | 3 | 4 | 5;
  libelle: string;
  couleurHex: string;
  plageTauxEpargne: string;
  commentaireConseiller: string;
  reperes: string[];
}

interface PalierScoreEpargne {
  seuilMinimalInclus: number;
  score: ResultatScoreEpargne["score"];
  libelle: string;
  couleurHex: string;
  plageTauxEpargne: string;
  commentaireConseiller: string;
}

const REPERES_SCORE_EPARGNE = [
  "Le taux d'épargne moyen des ménages canadiens se situe historiquement autour de 4 à 7 % (Statistique Canada).",
  "Les planificateurs financiers québécois recommandent généralement entre 10 % et 20 % du revenu brut pour la retraite.",
  "La règle empirique du « 10× » suggère d'accumuler 10 fois le revenu annuel à la retraite.",
] as const;

const PALIERS_SCORE_EPARGNE: readonly PalierScoreEpargne[] = [
  {
    seuilMinimalInclus: 20,
    score: 5,
    libelle: "Excellent",
    couleurHex: "#2D7A5F",
    plageTauxEpargne: "≥ 20 %",
    commentaireConseiller:
      "Votre taux d'épargne dépasse les recommandations des planificateurs financiers. Excellente trajectoire vers une retraite confortable. À ce rythme, vous disposerez d'une marge de manœuvre significative.",
  },
  {
    seuilMinimalInclus: 15,
    score: 4,
    libelle: "Très bon",
    couleurHex: "#5C9968",
    plageTauxEpargne: "15 % – 19,9 %",
    commentaireConseiller:
      "Vous épargnez au-dessus de la cible recommandée. Très bonne discipline financière. Maintenez cette trajectoire et envisagez d'optimiser la répartition REER / CELI selon votre taux marginal effectif.",
  },
  {
    seuilMinimalInclus: 10,
    score: 3,
    libelle: "Adéquat",
    couleurHex: "#C9A961",
    plageTauxEpargne: "10 % – 14,9 %",
    commentaireConseiller:
      "Votre taux d'épargne correspond à la recommandation classique de 10 à 15 % du revenu brut. Trajectoire saine, mais peu de marge en cas d'imprévu. Envisagez d'augmenter graduellement vos cotisations.",
  },
  {
    seuilMinimalInclus: 5,
    score: 2,
    libelle: "Insuffisant",
    couleurHex: "#C97B3F",
    plageTauxEpargne: "5 % – 9,9 %",
    commentaireConseiller:
      "Votre taux d'épargne est inférieur aux recommandations des planificateurs. À ce rythme, le capital accumulé à la retraite pourrait être insuffisant pour maintenir votre niveau de vie.",
  },
  {
    seuilMinimalInclus: Number.NEGATIVE_INFINITY,
    score: 1,
    libelle: "Critique",
    couleurHex: "#A04545",
    plageTauxEpargne: "< 5 %",
    commentaireConseiller:
      "Taux d'épargne largement sous la cible. Risque significatif d'insuffisance de capital à la retraite. Une révision en profondeur du budget et des priorités financières est recommandée.",
  },
] as const;

function arrondir4(valeur: number): number {
  return Math.round(valeur * 10000) / 10000;
}

/**
 * Calcule le taux d'épargne global à partir des cotisations annuelles.
 *
 * Le calcul retient la définition demandée par le cahier des charges :
 * (REER + CELI + épargne non enregistrée) / revenu brut.
 */
export function calculerTauxEpargne(entree: EntreeScoreEpargne): number {
  const revenuBrutAnnuel = Math.max(0, entree.revenuBrutAnnuel);

  if (revenuBrutAnnuel <= 0) {
    return 0;
  }

  const epargneTotale =
    Math.max(0, entree.cotisationReer ?? 0) +
    Math.max(0, entree.cotisationCeli ?? 0) +
    Math.max(0, entree.epargneNonEnregistree ?? 0);

  return arrondir4((epargneTotale / revenuBrutAnnuel) * 100);
}

/**
 * Attribue un score d'épargne sur 5 selon les seuils du cahier des charges.
 */
export function calculerScoreEpargne(
  entree: EntreeScoreEpargne,
): ResultatScoreEpargne {
  const tauxEpargne = calculerTauxEpargne(entree);
  const palier = PALIERS_SCORE_EPARGNE.find(
    (element) => tauxEpargne >= element.seuilMinimalInclus,
  );

  if (!palier) {
    throw new Error("Aucun palier de score d'épargne n'a été trouvé.");
  }

  return {
    tauxEpargne,
    score: palier.score,
    libelle: palier.libelle,
    couleurHex: palier.couleurHex,
    plageTauxEpargne: palier.plageTauxEpargne,
    commentaireConseiller: palier.commentaireConseiller,
    reperes: [...REPERES_SCORE_EPARGNE],
  };
}
