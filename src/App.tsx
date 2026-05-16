import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hypothesesIqpf } from "./data/assumptions-iqpf";
import { calculerDroitsREER } from "./engine/accounts/rrsp";
import { calculerDroitsCELIDisponibles } from "./engine/accounts/tfsa";
import { calculerPaiementHypothecaireCanadien } from "./engine/mortgage/canadian-amortization";
import { projeterAccumulationJusquaRetraite } from "./engine/projections/accumulation";
import { simulerDecaissementDepuisAccumulation } from "./engine/projections/decumulation";
import { calculerScoreEpargne } from "./engine/savings-score";
import { calculerImpotFederal2025 } from "./engine/tax/federal";
import { calculerCotisationsSociales2025 } from "./engine/tax/payroll";
import { calculerImpotQuebec2025 } from "./engine/tax/quebec";
import type {
  ProfilUtilisateurMinimal,
  ProvinceResidence,
  StatutMarital,
} from "./engine/types";

const ANNEE_COURANTE = new Date().getFullYear();

type OngletActif =
  | "tableau-bord"
  | "profil"
  | "fiscalite"
  | "accumulation"
  | "decaissement"
  | "hypotheque"
  | "hypotheses";

interface EtatProfil extends ProfilUtilisateurMinimal {
  prenom: string;
}

interface EtatSaisie {
  revenuEmploi: number;
  bonusAnnuel: number;
  dividendeTrimestriel: number;
  revenuGagneAnneePrecedente: number;
  cotisationReerAnnuelle: number;
  cotisationCeliAnnuelle: number;
  cotisationNonEnregistreeAnnuelle: number;
  depensesAnnuellesActuelles: number;
  soldeReerInitial: number;
  soldeCeliInitial: number;
  soldeNonEnregistreInitial: number;
  valeurImmobiliereInitiale: number;
  partUtilisateurImmobilier: number;
  capitalHypotheque: number;
  tauxHypothecaire: number;
  amortissementHypothecaire: number;
  versementsParAnHypothecaire: number;
  anneeCouranteCELI: number;
  anneeNaissanceCELI: number;
  anneeArriveeCanadaCELI: number;
  droitsReportesCELI: number;
  retraitsAnneePrecedenteCELI: number;
  cotisationsCumulativesCELI: number;
  retraitAnnuelInitialDecaissement: number;
  rendementAnnuelDecaissement: number;
  indexationRetraitDecaissement: number;
  ageDebutRrq: number;
  proportionCotisationRrq: number;
  ageDebutPsv: number;
  anneesResidenceCanadaApres18: number;
  ageVenteMaison: number;
}

const profilInitial: EtatProfil = {
  prenom: "",
  ageActuel: 40,
  anneeNaissance: ANNEE_COURANTE - 40,
  ageRetraite: 60,
  esperanceVie: 95,
  provinceResidence: "QC",
  statutMarital: "celibataire",
};

const etatInitial: EtatSaisie = {
  revenuEmploi: 100000,
  bonusAnnuel: 8000,
  dividendeTrimestriel: 500,
  revenuGagneAnneePrecedente: 100000,
  cotisationReerAnnuelle: 12000,
  cotisationCeliAnnuelle: 7000,
  cotisationNonEnregistreeAnnuelle: 3000,
  depensesAnnuellesActuelles: 42000,
  soldeReerInitial: 150000,
  soldeCeliInitial: 65000,
  soldeNonEnregistreInitial: 25000,
  valeurImmobiliereInitiale: 650000,
  partUtilisateurImmobilier: 50,
  capitalHypotheque: 320000,
  tauxHypothecaire: 5.25,
  amortissementHypothecaire: 22,
  versementsParAnHypothecaire: 12,
  anneeCouranteCELI: ANNEE_COURANTE,
  anneeNaissanceCELI: ANNEE_COURANTE - 40,
  anneeArriveeCanadaCELI: 2008,
  droitsReportesCELI: 0,
  retraitsAnneePrecedenteCELI: 0,
  cotisationsCumulativesCELI: 0,
  retraitAnnuelInitialDecaissement: 55000,
  rendementAnnuelDecaissement: 4.5,
  indexationRetraitDecaissement: 2,
  ageDebutRrq: 65,
  proportionCotisationRrq: 100,
  ageDebutPsv: 65,
  anneesResidenceCanadaApres18: 40,
  ageVenteMaison: 75,
};

const OPTIONS_PROVINCE: ReadonlyArray<{ value: ProvinceResidence; label: string }> = [
  { value: "QC", label: "Québec" },
  { value: "AUTRE", label: "Autre province" },
];

const OPTIONS_STATUT_MARITAL: ReadonlyArray<{ value: StatutMarital; label: string }> = [
  { value: "celibataire", label: "Célibataire" },
  { value: "marie", label: "Marié" },
  { value: "conjoint_de_fait", label: "Conjoint de fait" },
  { value: "divorce", label: "Divorcé" },
  { value: "veuf", label: "Veuf" },
];

const ONGLETS: ReadonlyArray<{ id: OngletActif; label: string }> = [
  { id: "tableau-bord", label: "Tableau de bord" },
  { id: "profil", label: "Profil" },
  { id: "fiscalite", label: "Fiscalité" },
  { id: "accumulation", label: "Accumulation" },
  { id: "decaissement", label: "Décaissement" },
  { id: "hypotheque", label: "Hypothèque" },
  { id: "hypotheses", label: "Hypothèses" },
];

const IMPOT_NUL = {
  revenuNet: 0,
  revenuImposable: 0,
  impotBrut: 0,
  credits: 0,
  impotNet: 0,
};

function formatMonetaire(valeur: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(valeur);
}

function formatCompact(valeur: number): string {
  return new Intl.NumberFormat("fr-CA", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valeur);
}

function formatPourcentage(valeur: number): string {
  return `${valeur.toFixed(2)} %`;
}

function formatAnneeAge(annee: number, age: number): string {
  return `${annee} (${age} ans)`;
}

function lireNombre(valeur: string, valeurParDefaut: number): number {
  if (valeur.trim() === "") {
    return valeurParDefaut;
  }

  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : valeurParDefaut;
}

function bornerPourcentage(valeur: number): number {
  return Math.min(100, Math.max(0, valeur));
}

function validerProfil(profil: EtatProfil): string[] {
  const messages: string[] = [];

  if (profil.ageActuel < 18 || profil.ageActuel > 100) {
    messages.push("L'âge actuel doit être entre 18 et 100 ans.");
  }

  if (profil.ageRetraite < 50 || profil.ageRetraite > 75) {
    messages.push("L'âge visé pour la retraite doit être entre 50 et 75 ans.");
  }

  if (profil.ageRetraite <= profil.ageActuel) {
    messages.push("L'âge de retraite doit être supérieur à l'âge actuel.");
  }

  if (profil.esperanceVie < profil.ageRetraite) {
    messages.push("L'espérance de vie doit être au moins égale à l'âge de retraite.");
  }

  if (Math.abs((ANNEE_COURANTE - profil.ageActuel) - profil.anneeNaissance) > 1) {
    messages.push("L'année de naissance ne semble pas cohérente avec l'âge actuel.");
  }

  return messages;
}

function calculerTexteCapaciteEpargne(revenuDisponible: number): string {
  if (revenuDisponible <= 0) {
    return "Avec ces valeurs, le revenu est presque entièrement absorbé. Il faut revoir les charges ou le rythme d'épargne.";
  }

  if (revenuDisponible < 20000) {
    return "Il reste un peu de marge, mais le budget demeure serré.";
  }

  if (revenuDisponible < 50000) {
    return "La marge restante est intéressante et permet une épargne régulière.";
  }

  return "La marge restante est élevée et laisse beaucoup d'espace pour l'épargne et les projets.";
}

function calculerTexteHypotheque(paiementMensuelEquivalent: number): string {
  if (paiementMensuelEquivalent < 1500) {
    return "Le paiement estimé semble relativement léger à l'échelle d'un budget familial moyen.";
  }

  if (paiementMensuelEquivalent < 3000) {
    return "Le paiement estimé est de taille moyenne. Il faut le comparer à votre revenu mensuel réel.";
  }

  return "Le paiement estimé est important. Il faut valider le confort mensuel avec soin.";
}

function calculerTexteDecaissement(capitalEpuise: boolean, anneeEpuisement: number | null): string {
  if (capitalEpuise) {
    return `Dans ce scénario, le capital s'épuise vers ${anneeEpuisement}.`;
  }

  return "Dans ce scénario, le capital tient jusqu'à la fin de l'horizon choisi.";
}

interface ChampNombreProps {
  etiquette: string;
  valeur: number;
  aide?: string;
  min?: number;
  max?: number;
  pas?: number;
  suffixe?: string;
  onChange: (valeur: number) => void;
}

function ChampNombre({
  etiquette,
  valeur,
  aide,
  min,
  max,
  pas = 1,
  suffixe,
  onChange,
}: ChampNombreProps) {
  return (
    <label className="field">
      <span className="field-label">{etiquette}</span>
      <div className="input-shell">
        <input
          className="input"
          type="number"
          value={valeur}
          min={min}
          max={max}
          step={pas}
          onChange={(event) => onChange(lireNombre(event.target.value, 0))}
        />
        {suffixe ? <span className="input-suffix">{suffixe}</span> : null}
      </div>
      {aide ? <span className="field-help">{aide}</span> : null}
    </label>
  );
}

interface ChampTexteProps {
  etiquette: string;
  valeur: string;
  aide?: string;
  onChange: (valeur: string) => void;
}

function ChampTexte({ etiquette, valeur, aide, onChange }: ChampTexteProps) {
  return (
    <label className="field">
      <span className="field-label">{etiquette}</span>
      <div className="input-shell">
        <input
          className="input"
          type="text"
          value={valeur}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {aide ? <span className="field-help">{aide}</span> : null}
    </label>
  );
}

interface ChampChoixProps<T extends string> {
  etiquette: string;
  valeur: T;
  aide?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (valeur: T) => void;
}

function ChampChoix<T extends string>({
  etiquette,
  valeur,
  aide,
  options,
  onChange,
}: ChampChoixProps<T>) {
  return (
    <label className="field">
      <span className="field-label">{etiquette}</span>
      <div className="input-shell">
        <select
          className="input input-select"
          value={valeur}
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {aide ? <span className="field-help">{aide}</span> : null}
    </label>
  );
}

interface CarteResultatProps {
  titre: string;
  valeur: string;
  description: string;
  detail?: string;
  tonalite?: "default" | "alert" | "success";
}

function CarteResultat({
  titre,
  valeur,
  description,
  detail,
  tonalite = "default",
}: CarteResultatProps) {
  return (
    <article className={`card result-card ${tonalite !== "default" ? `is-${tonalite}` : ""}`}>
      <h3>{titre}</h3>
      <p className="metric">{valeur}</p>
      <p>{description}</p>
      {detail ? <p className="result-detail">{detail}</p> : null}
    </article>
  );
}

interface TableauProps {
  titres: string[];
  lignes: ReactNode[][];
}

function Tableau({ titres, lignes }: TableauProps) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {titres.map((titre) => (
              <th key={titre}>{titre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, index) => (
            <tr key={`ligne-${index}`}>
              {ligne.map((cellule, celluleIndex) => (
                <td key={`cellule-${index}-${celluleIndex}`}>{cellule}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [profil, setProfil] = useState<EtatProfil>(profilInitial);
  const [etat, setEtat] = useState<EtatSaisie>(etatInitial);
  const [ongletActif, setOngletActif] = useState<OngletActif>("tableau-bord");

  const messagesProfil = useMemo(() => validerProfil(profil), [profil]);
  const profilValide = messagesProfil.length === 0;
  const prenomAffiche = profil.prenom.trim() || "vous";
  const modeQuebec = profil.provinceResidence === "QC";
  const revenuTravailCourant = etat.revenuEmploi + etat.bonusAnnuel;
  const dividendesAnnuels = etat.dividendeTrimestriel * 4;
  const revenuTotalCourant = revenuTravailCourant + dividendesAnnuels;
  const partImmobiliere = bornerPourcentage(etat.partUtilisateurImmobilier) / 100;

  const cotisations = useMemo(
    () => calculerCotisationsSociales2025({ revenuTravail: revenuTravailCourant }),
    [revenuTravailCourant],
  );

  const impotFederal = useMemo(
    () =>
      calculerImpotFederal2025({
        revenuEmploi: revenuTotalCourant,
        deductionREER: etat.cotisationReerAnnuelle,
        resideAuQuebec: modeQuebec,
        cotisationsSociales: cotisations,
      }),
    [cotisations, etat.cotisationReerAnnuelle, modeQuebec, revenuTotalCourant],
  );

  const impotQuebec = useMemo(
    () =>
      modeQuebec
        ? calculerImpotQuebec2025({
            revenuEmploi: revenuTotalCourant,
            deductionREER: etat.cotisationReerAnnuelle,
            cotisationsSociales: cotisations,
          })
        : IMPOT_NUL,
    [cotisations, etat.cotisationReerAnnuelle, modeQuebec, revenuTotalCourant],
  );

  const droitsREER = useMemo(
    () => calculerDroitsREER({ revenuGagneAnneePrecedente: etat.revenuGagneAnneePrecedente }),
    [etat.revenuGagneAnneePrecedente],
  );

  const droitsCELI = useMemo(
    () =>
      calculerDroitsCELIDisponibles({
        anneeCourante: etat.anneeCouranteCELI,
        anneeNaissance: etat.anneeNaissanceCELI,
        anneeArriveeCanada: etat.anneeArriveeCanadaCELI,
        droitsReportes: etat.droitsReportesCELI,
        retraitsAnneePrecedente: etat.retraitsAnneePrecedenteCELI,
        cotisationsCumulatives: etat.cotisationsCumulativesCELI,
      }),
    [
      etat.anneeArriveeCanadaCELI,
      etat.anneeCouranteCELI,
      etat.anneeNaissanceCELI,
      etat.cotisationsCumulativesCELI,
      etat.droitsReportesCELI,
      etat.retraitsAnneePrecedenteCELI,
    ],
  );

  const paiementHypothecaireComplet = useMemo(
    () =>
      calculerPaiementHypothecaireCanadien({
        capitalInitial: etat.capitalHypotheque,
        tauxNominalAnnuel: etat.tauxHypothecaire / 100,
        anneesAmortissement: etat.amortissementHypothecaire,
        versementsParAn: etat.versementsParAnHypothecaire,
      }),
    [
      etat.amortissementHypothecaire,
      etat.capitalHypotheque,
      etat.tauxHypothecaire,
      etat.versementsParAnHypothecaire,
    ],
  );

  const paiementHypothecaireUtilisateur = paiementHypothecaireComplet * partImmobiliere;
  const equivalentMensuelHypotheque =
    (paiementHypothecaireUtilisateur * etat.versementsParAnHypothecaire) / 12;

  const scoreEpargne = useMemo(
    () =>
      calculerScoreEpargne({
        revenuBrutAnnuel: revenuTotalCourant,
        cotisationReer: etat.cotisationReerAnnuelle,
        cotisationCeli: etat.cotisationCeliAnnuelle,
        epargneNonEnregistree: etat.cotisationNonEnregistreeAnnuelle,
      }),
    [
      etat.cotisationCeliAnnuelle,
      etat.cotisationNonEnregistreeAnnuelle,
      etat.cotisationReerAnnuelle,
      revenuTotalCourant,
    ],
  );

  const accumulation = useMemo(
    () =>
      profilValide
        ? projeterAccumulationJusquaRetraite({
            profil,
            anneeCourante: ANNEE_COURANTE,
            revenuEmploiActuel: etat.revenuEmploi,
            bonusAnnuelActuel: etat.bonusAnnuel,
            dividendesTrimestrielsActuels: etat.dividendeTrimestriel,
            depensesAnnuellesActuelles: etat.depensesAnnuellesActuelles,
            cotisationReerAnnuelle: etat.cotisationReerAnnuelle,
            cotisationCeliAnnuelle: etat.cotisationCeliAnnuelle,
            cotisationNonEnregistreeAnnuelle: etat.cotisationNonEnregistreeAnnuelle,
            soldeReerInitial: etat.soldeReerInitial,
            soldeCeliInitial: etat.soldeCeliInitial,
            soldeNonEnregistreInitial: etat.soldeNonEnregistreInitial,
            valeurImmobiliereInitiale: etat.valeurImmobiliereInitiale,
            partUtilisateurImmobilier: partImmobiliere,
            soldeHypothecaireInitial: etat.capitalHypotheque,
            tauxHypothecaire: etat.tauxHypothecaire / 100,
            amortissementHypothecaireAnnees: etat.amortissementHypothecaire,
            versementsHypothecairesParAn: etat.versementsParAnHypothecaire,
            croissanceSalaire: hypothesesIqpf.croissanceSalaires,
            inflation: hypothesesIqpf.inflation,
            rendementReer: hypothesesIqpf.rendementNominal.actionsCanadiennes,
            rendementCeli: hypothesesIqpf.rendementNominal.actionsCanadiennes,
            rendementNonEnregistre: hypothesesIqpf.rendementNominal.actionsCanadiennes,
            croissanceImmobiliere: hypothesesIqpf.immobilier.residencePrincipale,
          })
        : null,
    [etat, partImmobiliere, profil, profilValide],
  );

  const nombreAnneesDecaissement = Math.max(1, profil.esperanceVie - profil.ageRetraite);

  const simulationDecaissement = useMemo(
    () =>
      accumulation
        ? simulerDecaissementDepuisAccumulation(accumulation, {
            retraitAnnuelCibleInitial: etat.retraitAnnuelInitialDecaissement,
            rendementReer: etat.rendementAnnuelDecaissement / 100,
            rendementCeli: etat.rendementAnnuelDecaissement / 100,
            rendementNonEnregistre: etat.rendementAnnuelDecaissement / 100,
            croissanceImmobiliere: hypothesesIqpf.immobilier.residencePrincipale,
            indexationRetrait: etat.indexationRetraitDecaissement / 100,
            nombreAnnees: nombreAnneesDecaissement,
            ageDebutRrq: etat.ageDebutRrq,
            proportionCotisationRrq: etat.proportionCotisationRrq / 100,
            ageDebutPsv: etat.ageDebutPsv,
            anneesResidenceCanadaApres18: etat.anneesResidenceCanadaApres18,
            ageVenteMaison: etat.ageVenteMaison > 0 ? etat.ageVenteMaison : null,
          })
        : null,
    [
      accumulation,
      etat.ageDebutPsv,
      etat.ageDebutRrq,
      etat.ageVenteMaison,
      etat.anneesResidenceCanadaApres18,
      etat.indexationRetraitDecaissement,
      etat.proportionCotisationRrq,
      etat.rendementAnnuelDecaissement,
      etat.retraitAnnuelInitialDecaissement,
      nombreAnneesDecaissement,
    ],
  );

  const totalImpot = impotFederal.impotNet + impotQuebec.impotNet;
  const revenuApresImpotEtCotisations = revenuTotalCourant - totalImpot - cotisations.totalPersonnel;
  const premiereAnneeRetraite = simulationDecaissement?.points[0] ?? null;

  const donneesVentilationFiscale = useMemo(
    () => [
      { nom: "Fédéral", montant: impotFederal.impotNet },
      { nom: "Québec", montant: impotQuebec.impotNet },
      { nom: "Cotisations", montant: cotisations.totalPersonnel },
      { nom: "Net", montant: Math.max(0, revenuApresImpotEtCotisations) },
    ],
    [cotisations.totalPersonnel, impotFederal.impotNet, impotQuebec.impotNet, revenuApresImpotEtCotisations],
  );

  const donneesAccumulation = useMemo(
    () =>
      accumulation?.points.map((point) => ({
        etiquette: formatAnneeAge(point.annee, point.age),
        valeurNetteTotale: point.valeurNetteTotaleFin,
        reer: point.soldeReerFin,
        celi: point.soldeCeliFin,
      })) ?? [],
    [accumulation],
  );

  const donneesDecaissement = useMemo(
    () =>
      simulationDecaissement?.points.map((point) => ({
        etiquette: formatAnneeAge(point.annee, point.age),
        capitalRestant: point.soldeReerFin + point.soldeCeliFin + point.soldeNonEnregistreFin,
        retrait: point.retraitTotalBrut,
        net: point.netDisponible,
      })) ?? [],
    [simulationDecaissement],
  );

  const lignesFiscalite = useMemo<ReactNode[][]>(
    () => [
      ["Revenu de travail", formatMonetaire(revenuTravailCourant)],
      ["Dividendes annuels", formatMonetaire(dividendesAnnuels)],
      ["Revenu total", formatMonetaire(revenuTotalCourant)],
      ["Cotisations sociales", formatMonetaire(cotisations.totalPersonnel)],
      ["Impôt fédéral", formatMonetaire(impotFederal.impotNet)],
      ["Impôt Québec", formatMonetaire(impotQuebec.impotNet)],
      ["Net après prélèvements", formatMonetaire(revenuApresImpotEtCotisations)],
      ["Nouveaux droits REER", formatMonetaire(droitsREER)],
      ["Espace CELI disponible", formatMonetaire(droitsCELI)],
    ],
    [
      cotisations.totalPersonnel,
      dividendesAnnuels,
      droitsCELI,
      droitsREER,
      impotFederal.impotNet,
      impotQuebec.impotNet,
      revenuApresImpotEtCotisations,
      revenuTotalCourant,
      revenuTravailCourant,
    ],
  );

  const lignesAccumulation = useMemo<ReactNode[][]>(
    () =>
      accumulation?.points.map((point) => [
        point.annee,
        point.age,
        formatMonetaire(point.revenuEmploi),
        formatMonetaire(point.bonusAnnuel),
        formatMonetaire(point.dividendesAnnuels),
        formatMonetaire(point.cotisationReer),
        formatMonetaire(point.serviceHypothecaireAnnuel),
        formatMonetaire(point.soldeReerFin),
        formatMonetaire(point.soldeCeliFin),
        formatMonetaire(point.valeurNetteTotaleFin),
      ]) ?? [],
    [accumulation],
  );

  const lignesDecaissement = useMemo<ReactNode[][]>(
    () =>
      simulationDecaissement?.points.map((point) => [
        point.annee,
        point.age,
        formatMonetaire(point.rrq),
        formatMonetaire(point.psv),
        formatMonetaire(point.venteMaison),
        formatMonetaire(point.retraitReer),
        formatMonetaire(point.retraitCeli),
        formatMonetaire(point.retraitNonEnregistre),
        formatMonetaire(point.impotTotal),
        formatMonetaire(point.netDisponible),
        formatMonetaire(point.ecartObjectifNet),
        formatMonetaire(point.soldeReerFin),
        formatMonetaire(point.soldeCeliFin),
        formatMonetaire(point.soldeNonEnregistreFin),
        formatMonetaire(point.recuperationPsv),
      ]) ?? [],
    [simulationDecaissement],
  );

  function mettreAJour<K extends keyof EtatSaisie>(cle: K, valeur: EtatSaisie[K]) {
    setEtat((courant) => ({ ...courant, [cle]: valeur }));
  }

  function reinitialiser() {
    setProfil(profilInitial);
    setEtat(etatInitial);
    setOngletActif("tableau-bord");
  }

  function renduVerrouillage() {
    return (
      <section className="panel locked-card">
        <h2 className="section-title">Commencez ici</h2>
        <p className="section-copy">
          L'outil demande d'abord votre âge actuel, votre année de naissance et votre âge visé pour la retraite.
        </p>
        <ul>
          {messagesProfil.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>
    );
  }

  function renduProfil() {
    return (
      <div className="stack">
        <section className="panel">
          <h2 className="section-title">Profil de base</h2>
          <div className="field-grid">
            <ChampTexte etiquette="Prénom" valeur={profil.prenom} onChange={(valeur) => setProfil((courant) => ({ ...courant, prenom: valeur }))} />
            <ChampNombre etiquette="Âge actuel" valeur={profil.ageActuel} min={18} max={100} suffixe="ans" onChange={(valeur) => setProfil((courant) => ({ ...courant, ageActuel: valeur, anneeNaissance: ANNEE_COURANTE - valeur }))} />
            <ChampNombre etiquette="Année de naissance" valeur={profil.anneeNaissance} min={1900} max={ANNEE_COURANTE} onChange={(valeur) => setProfil((courant) => ({ ...courant, anneeNaissance: valeur }))} />
            <ChampNombre etiquette="Âge de retraite visé" valeur={profil.ageRetraite} min={50} max={75} suffixe="ans" onChange={(valeur) => setProfil((courant) => ({ ...courant, ageRetraite: valeur }))} />
            <ChampNombre etiquette="Espérance de vie" valeur={profil.esperanceVie} min={profil.ageRetraite} max={110} suffixe="ans" onChange={(valeur) => setProfil((courant) => ({ ...courant, esperanceVie: valeur }))} />
            <ChampChoix etiquette="Province" valeur={profil.provinceResidence} options={OPTIONS_PROVINCE} onChange={(valeur) => setProfil((courant) => ({ ...courant, provinceResidence: valeur }))} />
            <ChampChoix etiquette="Statut marital" valeur={profil.statutMarital} options={OPTIONS_STATUT_MARITAL} onChange={(valeur) => setProfil((courant) => ({ ...courant, statutMarital: valeur }))} />
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Revenus et épargne</h2>
          <div className="field-grid">
            <ChampNombre etiquette="Salaire brut annuel" valeur={etat.revenuEmploi} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("revenuEmploi", valeur)} />
            <ChampNombre etiquette="Boni annuel" valeur={etat.bonusAnnuel} pas={500} min={0} suffixe="$" aide="Le boni suit la même croissance que le salaire." onChange={(valeur) => mettreAJour("bonusAnnuel", valeur)} />
            <ChampNombre etiquette="Dividende trimestriel" valeur={etat.dividendeTrimestriel} pas={25} min={0} suffixe="$" aide="Traité ici comme un revenu imposable simplifié." onChange={(valeur) => mettreAJour("dividendeTrimestriel", valeur)} />
            <ChampNombre etiquette="Revenu gagné l'an dernier" valeur={etat.revenuGagneAnneePrecedente} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("revenuGagneAnneePrecedente", valeur)} />
            <ChampNombre etiquette="Cotisation REER annuelle" valeur={etat.cotisationReerAnnuelle} pas={100} min={0} suffixe="$" aide="Indexée automatiquement au taux de croissance salariale." onChange={(valeur) => mettreAJour("cotisationReerAnnuelle", valeur)} />
            <ChampNombre etiquette="Cotisation CELI annuelle" valeur={etat.cotisationCeliAnnuelle} pas={100} min={0} suffixe="$" onChange={(valeur) => mettreAJour("cotisationCeliAnnuelle", valeur)} />
            <ChampNombre etiquette="Épargne non enregistrée annuelle" valeur={etat.cotisationNonEnregistreeAnnuelle} pas={100} min={0} suffixe="$" onChange={(valeur) => mettreAJour("cotisationNonEnregistreeAnnuelle", valeur)} />
            <ChampNombre etiquette="Dépenses annuelles actuelles" valeur={etat.depensesAnnuellesActuelles} pas={500} min={0} suffixe="$" onChange={(valeur) => mettreAJour("depensesAnnuellesActuelles", valeur)} />
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Comptes et immobilier</h2>
          <div className="field-grid">
            <ChampNombre etiquette="Solde REER" valeur={etat.soldeReerInitial} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("soldeReerInitial", valeur)} />
            <ChampNombre etiquette="Solde CELI" valeur={etat.soldeCeliInitial} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("soldeCeliInitial", valeur)} />
            <ChampNombre etiquette="Solde non enregistré" valeur={etat.soldeNonEnregistreInitial} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("soldeNonEnregistreInitial", valeur)} />
            <ChampNombre etiquette="Valeur marchande de la maison" valeur={etat.valeurImmobiliereInitiale} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("valeurImmobiliereInitiale", valeur)} />
            <ChampNombre etiquette="Votre part de la propriété" valeur={etat.partUtilisateurImmobilier} pas={1} min={0} max={100} suffixe="%" aide="Exemple : 50 % si la propriété est détenue à parts égales." onChange={(valeur) => mettreAJour("partUtilisateurImmobilier", valeur)} />
          </div>
        </section>
      </div>
    );
  }

  function renduTableauBord() {
    if (!profilValide || !accumulation || !simulationDecaissement) {
      return renduVerrouillage();
    }

    return (
      <div className="stack">
        <div className="card-grid result-grid">
          <CarteResultat titre="Score d'épargne" valeur={`${scoreEpargne.score} / 5`} description={`${scoreEpargne.libelle} — ${scoreEpargne.plageTauxEpargne}`} detail={scoreEpargne.commentaireConseiller} tonalite={scoreEpargne.score >= 4 ? "success" : scoreEpargne.score <= 2 ? "alert" : "default"} />
          <CarteResultat titre="Revenu net après prélèvements" valeur={formatMonetaire(revenuApresImpotEtCotisations)} description="Ce qu'il reste aujourd'hui après impôts et cotisations." detail={calculerTexteCapaciteEpargne(revenuApresImpotEtCotisations)} />
          <CarteResultat titre="Début de retraite" valeur={formatMonetaire(accumulation.valeurNetteTotaleRetraite)} description={`Au 1er janvier ${accumulation.anneeRetraite}, à ${accumulation.ageRetraite} ans.`} detail={`REER ${formatMonetaire(accumulation.capitalReerRetraite)} | CELI ${formatMonetaire(accumulation.capitalCeliRetraite)} | Non enregistré ${formatMonetaire(accumulation.capitalNonEnregistreRetraite)}`} />
          <CarteResultat titre="Objectif suggéré de décaissement" valeur={formatMonetaire(accumulation.objectifDecaissementSuggereRetraite)} description="Suggestion basée sur les dépenses projetées au début de la retraite." detail={`Dépenses ${formatMonetaire(accumulation.depensesProjeteesRetraite)} | Hypothèque ${formatMonetaire(accumulation.serviceHypothecaireRetraiteEstime)}`} />
          <CarteResultat titre="Fin de retraite projetée" valeur={formatMonetaire(simulationDecaissement.capitalFinalTotal)} description="Capital estimé à la fin de l'horizon de retraite." detail={calculerTexteDecaissement(simulationDecaissement.capitalEpuise, simulationDecaissement.anneeEpuisement)} tonalite={simulationDecaissement.capitalEpuise ? "alert" : "success"} />
          <CarteResultat titre="Écart sur l'objectif la première année" valeur={formatMonetaire(premiereAnneeRetraite?.ecartObjectifNet ?? 0)} description="Net disponible moins objectif suggéré de retraite." detail={etat.ageVenteMaison > 0 ? `Vente de la maison prévue à ${etat.ageVenteMaison} ans.` : "Aucune vente de maison prévue."} tonalite={(premiereAnneeRetraite?.ecartObjectifNet ?? 0) >= 0 ? "success" : "alert"} />
        </div>

        <div className="chart-grid">
          <section className="card chart-card">
            <h3>Fiscalité actuelle</h3>
            <p className="section-copy">Vue simple de ce qui part en impôts, en cotisations et de ce qu'il reste.</p>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donneesVentilationFiscale}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="nom" tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Bar dataKey="montant" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card chart-card">
            <h3>Accumulation jusqu'à la retraite</h3>
            <p className="section-copy">La ligne principale montre la valeur nette totale projetée d'année en année.</p>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donneesAccumulation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="etiquette" tick={{ fill: "#675b4f", fontSize: 12 }} minTickGap={28} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Line type="monotone" dataKey="valeurNetteTotale" stroke="#0f766e" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="reer" stroke="#b45309" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="celi" stroke="#2f855a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card chart-card">
            <h3>Décaissement à la retraite</h3>
            <p className="section-copy">Capital restant, retraits bruts et net disponible, année par année.</p>
            <div className="chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donneesDecaissement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="etiquette" tick={{ fill: "#675b4f", fontSize: 12 }} minTickGap={28} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Area type="monotone" dataKey="capitalRestant" stroke="#0f766e" fill="rgba(15, 118, 110, 0.24)" />
                  <Line type="monotone" dataKey="retrait" stroke="#b45309" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" stroke="#2f855a" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renduFiscalite() {
    if (!profilValide) {
      return renduVerrouillage();
    }

    return (
      <div className="stack">
        <div className="card-grid result-grid">
          <CarteResultat titre="Impôt fédéral" valeur={formatMonetaire(impotFederal.impotNet)} description="Estimation simple pour l'année courante." />
          <CarteResultat
            titre={modeQuebec ? "Impôt Québec" : "Impôt provincial"}
            valeur={formatMonetaire(impotQuebec.impotNet)}
            description={modeQuebec ? "Estimation simple pour l'année courante." : "Le moteur détaillé actuel demeure surtout calibré pour le Québec."}
          />
          <CarteResultat titre="Droits REER estimés" valeur={formatMonetaire(droitsREER)} description="Espace REER généré par le revenu gagné l'an dernier." />
          <CarteResultat titre="Espace CELI disponible" valeur={formatMonetaire(droitsCELI)} description="Espace encore disponible selon les données saisies." />
        </div>
        <section className="panel">
          <h2 className="section-title">Décomposition actuelle</h2>
          <Tableau titres={["Poste", "Montant"]} lignes={lignesFiscalite} />
        </section>
      </div>
    );
  }

  function renduAccumulation() {
    if (!profilValide || !accumulation) {
      return renduVerrouillage();
    }

    return (
      <div className="stack">
        <div className="card-grid result-grid">
          <CarteResultat titre="REER à la retraite" valeur={formatMonetaire(accumulation.capitalReerRetraite)} description={`Au 1er janvier ${accumulation.anneeRetraite}, à ${accumulation.ageRetraite} ans.`} />
          <CarteResultat titre="CELI à la retraite" valeur={formatMonetaire(accumulation.capitalCeliRetraite)} description="Capital projeté dans le CELI au début de la retraite." />
          <CarteResultat titre="Non enregistré à la retraite" valeur={formatMonetaire(accumulation.capitalNonEnregistreRetraite)} description="Capital projeté hors comptes enregistrés." />
          <CarteResultat titre="Valeur nette immobilière" valeur={formatMonetaire(accumulation.valeurNetteImmobiliereRetraite)} description={`Votre part retenue : ${formatPourcentage(etat.partUtilisateurImmobilier)}.`} />
        </div>
        <section className="panel">
          <h2 className="section-title">Projection année par année</h2>
          <Tableau titres={["Année", "Âge", "Revenu de travail", "Boni", "Dividendes", "Cotisation REER", "Service hypothécaire", "REER", "CELI", "Valeur nette totale"]} lignes={lignesAccumulation} />
        </section>
      </div>
    );
  }

  function renduDecaissement() {
    if (!profilValide || !simulationDecaissement || !accumulation) {
      return renduVerrouillage();
    }

    return (
      <div className="stack">
        <section className="panel">
          <h2 className="section-title">Paramètres de retraite</h2>
          <p className="section-copy">
            Le capital de départ n'est jamais saisi à la main. Il est repris automatiquement de la fin de l'accumulation au 1er janvier {accumulation.anneeRetraite}, à {accumulation.ageRetraite} ans.
          </p>
          <div className="field-grid">
            <ChampNombre etiquette="Retrait visé la première année" valeur={etat.retraitAnnuelInitialDecaissement} pas={100} min={0} suffixe="$" onChange={(valeur) => mettreAJour("retraitAnnuelInitialDecaissement", valeur)} />
            <ChampNombre etiquette="Rendement annuel en retraite" valeur={etat.rendementAnnuelDecaissement} pas={0.1} suffixe="%" onChange={(valeur) => mettreAJour("rendementAnnuelDecaissement", valeur)} />
            <ChampNombre etiquette="Hausse annuelle des retraits" valeur={etat.indexationRetraitDecaissement} pas={0.1} suffixe="%" onChange={(valeur) => mettreAJour("indexationRetraitDecaissement", valeur)} />
            <ChampNombre etiquette="Âge de début RRQ" valeur={etat.ageDebutRrq} min={60} max={72} suffixe="ans" onChange={(valeur) => mettreAJour("ageDebutRrq", valeur)} />
            <ChampNombre etiquette="Proportion de rente RRQ retenue" valeur={etat.proportionCotisationRrq} min={0} max={100} suffixe="%" aide="100 % = rente maximale simplifiée." onChange={(valeur) => mettreAJour("proportionCotisationRrq", valeur)} />
            <ChampNombre etiquette="Âge de début PSV" valeur={etat.ageDebutPsv} min={65} max={70} suffixe="ans" onChange={(valeur) => mettreAJour("ageDebutPsv", valeur)} />
            <ChampNombre etiquette="Années de résidence au Canada après 18 ans" valeur={etat.anneesResidenceCanadaApres18} min={0} max={40} suffixe="ans" onChange={(valeur) => mettreAJour("anneesResidenceCanadaApres18", valeur)} />
            <ChampNombre etiquette="Âge de vente de la maison" valeur={etat.ageVenteMaison} min={0} max={110} suffixe="ans" aide="Mettez 0 si vous ne voulez pas tenir compte d'une vente." onChange={(valeur) => mettreAJour("ageVenteMaison", valeur)} />
          </div>
        </section>

        <div className="card-grid result-grid">
          <CarteResultat titre="Objectif suggéré" valeur={formatMonetaire(accumulation.objectifDecaissementSuggereRetraite)} description="Proposition basée sur les dépenses projetées et l'hypothèque résiduelle estimée." />
          <CarteResultat titre="Écart première année" valeur={formatMonetaire(premiereAnneeRetraite?.ecartObjectifNet ?? 0)} description="Net disponible moins objectif suggéré." tonalite={(premiereAnneeRetraite?.ecartObjectifNet ?? 0) >= 0 ? "success" : "alert"} />
          <CarteResultat titre="Capital de départ calculé" valeur={formatMonetaire(simulationDecaissement.capitalInitialTotal)} description={`Démarrage automatique en ${accumulation.anneeRetraite} à ${accumulation.ageRetraite} ans.`} />
          <CarteResultat titre="Capital final projeté" valeur={formatMonetaire(simulationDecaissement.capitalFinalTotal)} description={calculerTexteDecaissement(simulationDecaissement.capitalEpuise, simulationDecaissement.anneeEpuisement)} tonalite={simulationDecaissement.capitalEpuise ? "alert" : "success"} />
        </div>

        <section className="panel">
          <h2 className="section-title">Tableau de décaissement</h2>
          <Tableau titres={["Année", "Âge", "RRQ", "PSV", "Vente maison", "Retrait REER", "Retrait CELI", "Retrait non enr.", "Impôt total", "Net disponible", "Écart objectif", "Solde REER", "Solde CELI", "Solde non enr.", "Récupération PSV"]} lignes={lignesDecaissement} />
        </section>
      </div>
    );
  }

  function renduHypotheque() {
    if (!profilValide) {
      return renduVerrouillage();
    }

    return (
      <div className="stack">
        <section className="panel">
          <h2 className="section-title">Hypothèque</h2>
          <p className="section-copy">
            Entrez l'hypothèque complète et la part qui vous revient. Les projections utilisent seulement votre quote-part.
          </p>
          <div className="field-grid">
            <ChampNombre etiquette="Solde hypothécaire total" valeur={etat.capitalHypotheque} pas={1000} min={0} suffixe="$" onChange={(valeur) => mettreAJour("capitalHypotheque", valeur)} />
            <ChampNombre etiquette="Votre part de la propriété et de l'hypothèque" valeur={etat.partUtilisateurImmobilier} pas={1} min={0} max={100} suffixe="%" onChange={(valeur) => mettreAJour("partUtilisateurImmobilier", valeur)} />
            <ChampNombre etiquette="Taux contractuel" valeur={etat.tauxHypothecaire} pas={0.01} min={0} suffixe="%" onChange={(valeur) => mettreAJour("tauxHypothecaire", valeur)} />
            <ChampNombre etiquette="Amortissement résiduel" valeur={etat.amortissementHypothecaire} pas={1} min={1} suffixe="ans" onChange={(valeur) => mettreAJour("amortissementHypothecaire", valeur)} />
            <ChampNombre etiquette="Versements par an" valeur={etat.versementsParAnHypothecaire} pas={1} min={1} onChange={(valeur) => mettreAJour("versementsParAnHypothecaire", valeur)} />
          </div>
        </section>
        <div className="card-grid result-grid">
          <CarteResultat titre="Paiement par versement complet" valeur={formatMonetaire(paiementHypothecaireComplet)} description="Calcul canadien à capitalisation semi-annuelle." />
          <CarteResultat titre="Votre paiement par versement" valeur={formatMonetaire(paiementHypothecaireUtilisateur)} description={`Quote-part retenue : ${formatPourcentage(etat.partUtilisateurImmobilier)}.`} />
          <CarteResultat titre="Votre équivalent mensuel" valeur={formatMonetaire(equivalentMensuelHypotheque)} description={calculerTexteHypotheque(equivalentMensuelHypotheque)} />
        </div>
      </div>
    );
  }

  function renduHypotheses() {
    return (
      <div className="stack">
        <section className="panel">
          <h2 className="section-title">Hypothèses IQPF par défaut</h2>
          <Tableau
            titres={["Paramètre", "Valeur"]}
            lignes={[
              ["Inflation", formatPourcentage(hypothesesIqpf.inflation * 100)],
              ["Croissance salariale", formatPourcentage(hypothesesIqpf.croissanceSalaires * 100)],
              ["Actions canadiennes", formatPourcentage(hypothesesIqpf.rendementNominal.actionsCanadiennes * 100)],
              ["Taux d'emprunt long terme", formatPourcentage(hypothesesIqpf.tauxEmprunt.hypotheseLongTerme * 100)],
              ["Croissance immobilière", formatPourcentage(hypothesesIqpf.immobilier.residencePrincipale * 100)],
            ]}
          />
        </section>
        <section className="panel">
          <h2 className="section-title">Repères de conseiller</h2>
          <ul>
            {scoreEpargne.reperes.map((repere) => (
              <li key={repere}>{repere}</li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  function renduContenuOnglet() {
    switch (ongletActif) {
      case "profil":
        return renduProfil();
      case "fiscalite":
        return renduFiscalite();
      case "accumulation":
        return renduAccumulation();
      case "decaissement":
        return renduDecaissement();
      case "hypotheque":
        return renduHypotheque();
      case "hypotheses":
        return renduHypotheses();
      case "tableau-bord":
      default:
        return renduTableauBord();
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="status-pill">Touches finales du parcours retraite</span>
        <h1>Planification financière Québec / Canada</h1>
        <p>
          Bonjour {prenomAffiche}. Cette version ajoute les derniers leviers qui manquaient le plus dans un usage personnel réel : objectif suggéré de décaissement, boni annuel, dividendes trimestriels, quote-part immobilière et vente de la maison à un âge donné.
        </p>
        <p className="warning">
          Les dividendes sont encore traités ici comme un revenu imposable simplifié. Le parcours global est cohérent, mais la fiscalité détaillée des dividendes restera une prochaine couche d'amélioration.
        </p>
      </section>

      <section className="section">
        <div className="tabs-shell">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              className={`tab-button ${ongletActif === onglet.id ? "is-active" : ""}`}
              onClick={() => setOngletActif(onglet.id)}
            >
              {onglet.label}
            </button>
          ))}
          <button type="button" className="secondary-button" onClick={reinitialiser}>
            Réinitialiser
          </button>
        </div>
      </section>

      <section className="section">{renduContenuOnglet()}</section>
    </main>
  );
}
