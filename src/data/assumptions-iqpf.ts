import {
  hypothesesIqpf2026,
  type HypothesesIqpf2026,
} from "./assumptions-iqpf-2026";

/**
 * Point d'entrée canonique des hypothèses IQPF par défaut.
 *
 * Ce fichier permet d'aligner progressivement le projet avec la structure
 * cible du cahier des charges sans casser les imports existants déjà en place.
 */
export const hypothesesIqpfParDefaut = hypothesesIqpf2026;
export const hypothesesIqpf = hypothesesIqpfParDefaut;

export type HypothesesIqpfParDefaut = HypothesesIqpf2026;
