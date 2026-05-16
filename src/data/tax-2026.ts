import { donneesFiscales2025 } from "./tax-2025";

/**
 * Espace réservé pour les paramètres fiscaux 2026.
 *
 * Ce fichier existe pour respecter la structure cible du projet. Les valeurs
 * 2026 devront être validées contre les sources officielles avant tout usage
 * en production personnelle.
 */
export const donneesFiscales2026Placeholder = {
  annee: 2026,
  statut: "placeholder",
  baseReference: 2025,
  message:
    "Mettre à jour ce fichier avec les paramètres fiscaux 2026 validés avant de brancher le moteur sur cette année.",
  apercuStructure: donneesFiscales2025,
} as const;
