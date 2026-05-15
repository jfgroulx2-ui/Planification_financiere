import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hypothesesIqpf2026 } from "./data/assumptions-iqpf-2026";
import { calculerDroitsREER } from "./engine/accounts/rrsp";
import { calculerDroitsCELIDisponibles } from "./engine/accounts/tfsa";
import { calculerPaiementHypothecaireCanadien } from "./engine/mortgage/canadian-amortization";
import { simulerDecaissementAnnuel } from "./engine/projections/decumulation";
import {
  projeterPatrimoineAnnuel,
  projeterPatrimoineAnnuelParAnnee,
} from "./engine/projections/net-worth";
import { calculerImpotFederal2025 } from "./engine/tax/federal";
import { calculerCotisationsSociales2025 } from "./engine/tax/payroll";
import { calculerImpotQuebec2025 } from "./engine/tax/quebec";

interface EtatSaisie {
  revenuEmploi: number;
  deductionREER: number;
  revenuGagneAnneePrecedente: number;
  anneeCouranteCELI: number;
  anneeNaissanceCELI: number;
  anneeArriveeCanadaCELI: number;
  droitsReportesCELI: number;
  retraitsAnneePrecedenteCELI: number;
  cotisationsCumulativesCELI: number;
  valeurInitialeProjection: number;
  contributionAnnuelleProjection: number;
  rendementAnnuelProjection: number;
  nombreAnneesProjection: number;
  capitalHypotheque: number;
  tauxHypothecaire: number;
  amortissementHypothecaire: number;
  versementsParAnHypothecaire: number;
  capitalInitialDecaissement: number;
  retraitAnnuelInitialDecaissement: number;
  rendementAnnuelDecaissement: number;
  indexationRetraitDecaissement: number;
  nombreAnneesDecaissement: number;
}

const etatInitial: EtatSaisie = {
  revenuEmploi: 100000,
  deductionREER: 0,
  revenuGagneAnneePrecedente: 100000,
  anneeCouranteCELI: 2026,
  anneeNaissanceCELI: 1990,
  anneeArriveeCanadaCELI: 2008,
  droitsReportesCELI: 0,
  retraitsAnneePrecedenteCELI: 0,
  cotisationsCumulativesCELI: 0,
  valeurInitialeProjection: 250000,
  contributionAnnuelleProjection: 18000,
  rendementAnnuelProjection: hypothesesIqpf2026.rendementNominal.actionsCanadiennes * 100,
  nombreAnneesProjection: 30,
  capitalHypotheque: 500000,
  tauxHypothecaire: 5.25,
  amortissementHypothecaire: 25,
  versementsParAnHypothecaire: 12,
  capitalInitialDecaissement: 1200000,
  retraitAnnuelInitialDecaissement: 55000,
  rendementAnnuelDecaissement: 4.5,
  indexationRetraitDecaissement: 2,
  nombreAnneesDecaissement: 35,
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

function calculerTexteCapaciteEpargne(revenuDisponible: number): string {
  if (revenuDisponible <= 0) {
    return "Avec ces valeurs, presque tout le revenu est deja absorbe. Il faudrait soit baisser certaines charges, soit revoir les hypotheses.";
  }

  if (revenuDisponible < 20000) {
    return "Il reste un peu de marge apres impots et cotisations, mais le budget risque d'etre serre pour epargner beaucoup.";
  }

  if (revenuDisponible < 50000) {
    return "Il reste une marge de manoeuvre interessante apres impots. Vous pouvez probablement epargner de facon reguliere.";
  }

  return "La marge restante est elevee. Ce scenario laisse beaucoup d'espace pour l'epargne, le remboursement de dettes ou l'investissement.";
}

function calculerTexteHypotheque(paiementParPeriode: number, versementsParAn: number): string {
  const estimationMensuelle = (paiementParPeriode * versementsParAn) / 12;

  if (estimationMensuelle < 1500) {
    return "Le paiement estime semble relativement leger a l'echelle d'un budget familial moyen.";
  }

  if (estimationMensuelle < 3000) {
    return "Le paiement estime est de taille moyenne. Il faut le comparer a votre revenu mensuel reel pour juger du confort.";
  }

  return "Le paiement estime est important. Pour un debutant, c'est un bon signal qu'il faut valider la capacite de payer mois apres mois.";
}

function calculerTexteDecaissement(capitalEpuise: boolean, anneeEpuisement: number | null): string {
  if (capitalEpuise) {
    return `Dans ce scenario, l'argent ne dure pas jusqu'a la fin de l'horizon choisi. L'epuisement arrive vers l'an ${anneeEpuisement}.`;
  }

  return "Dans ce scenario, le capital tient jusqu'a la fin de la periode choisie. Cela ne garantit pas que le plan soit optimal, mais le rythme de retrait semble soutenable.";
}

function lireNombre(valeur: string, valeurParDefaut: number): number {
  if (valeur.trim() === "") {
    return valeurParDefaut;
  }

  const nombre = Number(valeur);

  return Number.isFinite(nombre) ? nombre : valeurParDefaut;
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

interface TuileGuideProps {
  titre: string;
  texte: string;
}

function TuileGuide({ titre, texte }: TuileGuideProps) {
  return (
    <article className="card guide-card">
      <h3>{titre}</h3>
      <p>{texte}</p>
    </article>
  );
}

interface CarteGraphiqueProps {
  titre: string;
  description: string;
  children: ReactNode;
}

function CarteGraphique({ titre, description, children }: CarteGraphiqueProps) {
  return (
    <section className="card chart-card">
      <h3>{titre}</h3>
      <p className="section-copy">{description}</p>
      <div className="chart-shell">{children}</div>
    </section>
  );
}

interface CarteExplicationProps {
  titre: string;
  texte: string;
}

function CarteExplication({ titre, texte }: CarteExplicationProps) {
  return (
    <article className="card explanation-card">
      <h3>{titre}</h3>
      <p>{texte}</p>
    </article>
  );
}

export default function App() {
  const [etat, setEtat] = useState<EtatSaisie>(etatInitial);

  const cotisations = useMemo(
    () =>
      calculerCotisationsSociales2025({
        revenuTravail: etat.revenuEmploi,
      }),
    [etat.revenuEmploi],
  );

  const impotFederal = useMemo(
    () =>
      calculerImpotFederal2025({
        revenuEmploi: etat.revenuEmploi,
        deductionREER: etat.deductionREER,
        resideAuQuebec: true,
        cotisationsSociales: cotisations,
      }),
    [cotisations, etat.deductionREER, etat.revenuEmploi],
  );

  const impotQuebec = useMemo(
    () =>
      calculerImpotQuebec2025({
        revenuEmploi: etat.revenuEmploi,
        deductionREER: etat.deductionREER,
        cotisationsSociales: cotisations,
      }),
    [cotisations, etat.deductionREER, etat.revenuEmploi],
  );

  const droitsREER = useMemo(
    () =>
      calculerDroitsREER({
        revenuGagneAnneePrecedente: etat.revenuGagneAnneePrecedente,
      }),
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

  const paiementHypothecaire = useMemo(
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

  const projectionParAnnee = useMemo(
    () =>
      projeterPatrimoineAnnuelParAnnee({
        valeurInitiale: etat.valeurInitialeProjection,
        contributionAnnuelle: etat.contributionAnnuelleProjection,
        rendementAnnuel: etat.rendementAnnuelProjection / 100,
        nombreAnnees: etat.nombreAnneesProjection,
      }),
    [
      etat.contributionAnnuelleProjection,
      etat.nombreAnneesProjection,
      etat.rendementAnnuelProjection,
      etat.valeurInitialeProjection,
    ],
  );

  const projection = useMemo(
    () =>
      projeterPatrimoineAnnuel({
        valeurInitiale: etat.valeurInitialeProjection,
        contributionAnnuelle: etat.contributionAnnuelleProjection,
        rendementAnnuel: etat.rendementAnnuelProjection / 100,
        nombreAnnees: etat.nombreAnneesProjection,
      }),
    [
      etat.contributionAnnuelleProjection,
      etat.nombreAnneesProjection,
      etat.rendementAnnuelProjection,
      etat.valeurInitialeProjection,
    ],
  );

  const simulationDecaissement = useMemo(
    () =>
      simulerDecaissementAnnuel({
        capitalInitial: etat.capitalInitialDecaissement,
        retraitAnnuelInitial: etat.retraitAnnuelInitialDecaissement,
        rendementAnnuel: etat.rendementAnnuelDecaissement / 100,
        indexationRetrait: etat.indexationRetraitDecaissement / 100,
        nombreAnnees: etat.nombreAnneesDecaissement,
      }),
    [
      etat.capitalInitialDecaissement,
      etat.indexationRetraitDecaissement,
      etat.nombreAnneesDecaissement,
      etat.rendementAnnuelDecaissement,
      etat.retraitAnnuelInitialDecaissement,
    ],
  );

  const totalImpot = impotFederal.impotNet + impotQuebec.impotNet;
  const revenuApresImpotEtCotisations =
    etat.revenuEmploi - totalImpot - cotisations.totalPersonnel;
  const tauxPrelevementGlobal =
    etat.revenuEmploi > 0
      ? ((totalImpot + cotisations.totalPersonnel) / etat.revenuEmploi) * 100
      : 0;
  const gainProjete =
    projection -
    etat.valeurInitialeProjection -
    etat.contributionAnnuelleProjection * etat.nombreAnneesProjection;
  const equivalentMensuelHypotheque =
    (paiementHypothecaire * etat.versementsParAnHypothecaire) / 12;

  const donneesVentilationFiscale = useMemo(
    () => [
      { nom: "Federal", montant: impotFederal.impotNet },
      { nom: "Quebec", montant: impotQuebec.impotNet },
      { nom: "Cotisations", montant: cotisations.totalPersonnel },
      { nom: "Net disponible", montant: Math.max(0, revenuApresImpotEtCotisations) },
    ],
    [cotisations.totalPersonnel, impotFederal.impotNet, impotQuebec.impotNet, revenuApresImpotEtCotisations],
  );

  const donneesProjection = useMemo(
    () =>
      projectionParAnnee.map((point) => ({
        annee: `An ${point.anneeIndex}`,
        valeurFin: point.valeurFin,
        croissance: point.croissance,
        contribution: point.contribution,
      })),
    [projectionParAnnee],
  );

  const donneesDecaissement = useMemo(
    () =>
      simulationDecaissement.points.map((point) => ({
        annee: `An ${point.anneeIndex}`,
        capitalFin: point.valeurFin,
        retrait: point.retraitAnnuel,
      })),
    [simulationDecaissement.points],
  );

  function mettreAJour<K extends keyof EtatSaisie>(cle: K, valeur: EtatSaisie[K]) {
    setEtat((etatCourant) => ({
      ...etatCourant,
      [cle]: valeur,
    }));
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="status-pill">Version simple pour debuter</span>
        <h1>Planification financiere Quebec / Canada</h1>
        <p>
          Cet outil vous aide a repondre a des questions tres concretes:
          combien il vous reste apres les prelevements, combien vous pouvez
          accumuler dans le temps, et si votre argent risque de durer une fois
          a la retraite.
        </p>
        <p className="warning">
          Si un terme vous semble technique, laissez d'abord les valeurs par
          defaut et changez seulement une chose a la fois. L'outil est fait
          pour apprendre progressivement, pas pour tout remplir d'un coup.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Commencez ici</h2>
        <div className="card-grid guide-grid">
          <TuileGuide
            titre="1. Entrez votre revenu"
            texte="Commencez par votre salaire annuel avant impot. C'est le point de depart le plus simple pour obtenir un premier portrait."
          />
          <TuileGuide
            titre="2. Regardez ce qu'il reste"
            texte="Le panneau de droite montre ce qui part en impots et ce qu'il vous reste vraiment apres les prelevements obligatoires."
          />
          <TuileGuide
            titre="3. Testez un scenario a la fois"
            texte="Changez ensuite soit l'hypotheque, soit l'epargne, soit la retraite. Cela permet de voir tout de suite l'effet de votre choix."
          />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Mots simples</h2>
        <div className="card-grid guide-grid">
          <TuileGuide
            titre="REER"
            texte="Un compte qui peut reduire l'impot aujourd'hui, mais dont les retraits seront imposables plus tard."
          />
          <TuileGuide
            titre="CELI"
            texte="Un compte ou la croissance et les retraits ne sont pas imposes. Tres pratique pour garder de la flexibilite."
          />
          <TuileGuide
            titre="Decaissement"
            texte="C'est simplement le fait d'utiliser votre argent accumule pour vivre plus tard, souvent a la retraite."
          />
        </div>
      </section>

      <section className="workspace section">
        <div className="panel panel-form">
          <div className="panel-header">
            <h2 className="section-title">Vos donnees</h2>
            <button className="secondary-button" type="button" onClick={() => setEtat(etatInitial)}>
              Reinitialiser
            </button>
          </div>

          <section className="form-section">
            <h3>1. Votre salaire et vos retenues</h3>
            <p className="section-copy">
              Remplissez cette partie pour voir combien de votre salaire part en
              impot et en cotisations, puis combien il vous reste vraiment.
            </p>
            <div className="field-grid">
              <ChampNombre
                etiquette="Votre salaire annuel avant impot"
                valeur={etat.revenuEmploi}
                pas={100}
                min={0}
                suffixe="$"
                aide="Exemple: si vous gagnez 75 000 $ par an, inscrivez 75000."
                onChange={(valeur) => mettreAJour("revenuEmploi", valeur)}
              />
              <ChampNombre
                etiquette="Montant que vous pensez mettre dans votre REER"
                valeur={etat.deductionREER}
                pas={100}
                min={0}
                suffixe="$"
                aide="Si vous ne savez pas, laissez 0 pour commencer."
                onChange={(valeur) => mettreAJour("deductionREER", valeur)}
              />
              <ChampNombre
                etiquette="Votre salaire de l'an dernier"
                valeur={etat.revenuGagneAnneePrecedente}
                pas={100}
                min={0}
                suffixe="$"
                aide="Il sert surtout a estimer vos nouveaux droits REER."
                onChange={(valeur) => mettreAJour("revenuGagneAnneePrecedente", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>2. Votre espace CELI</h3>
            <p className="section-copy">
              Cette partie sert a estimer combien vous pouvez encore deposer
              dans votre CELI sans depasser votre limite.
            </p>
            <div className="field-grid">
              <ChampNombre
                etiquette="Annee du calcul"
                valeur={etat.anneeCouranteCELI}
                min={2009}
                max={2100}
                onChange={(valeur) => mettreAJour("anneeCouranteCELI", valeur)}
              />
              <ChampNombre
                etiquette="Votre annee de naissance"
                valeur={etat.anneeNaissanceCELI}
                min={1900}
                max={2100}
                onChange={(valeur) => mettreAJour("anneeNaissanceCELI", valeur)}
              />
              <ChampNombre
                etiquette="Annee ou vous etes devenu admissible au Canada"
                valeur={etat.anneeArriveeCanadaCELI}
                min={1900}
                max={2100}
                aide="Si vous avez toujours vecu au Canada a l'age adulte, laissez une annee ancienne."
                onChange={(valeur) => mettreAJour("anneeArriveeCanadaCELI", valeur)}
              />
              <ChampNombre
                etiquette="Ancien espace CELI non utilise"
                valeur={etat.droitsReportesCELI}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("droitsReportesCELI", valeur)}
              />
              <ChampNombre
                etiquette="Argent retire de votre CELI l'an dernier"
                valeur={etat.retraitsAnneePrecedenteCELI}
                pas={100}
                min={0}
                suffixe="$"
                aide="Cet espace revient normalement disponible l'annee suivante."
                onChange={(valeur) => mettreAJour("retraitsAnneePrecedenteCELI", valeur)}
              />
              <ChampNombre
                etiquette="Total deja depose dans votre CELI"
                valeur={etat.cotisationsCumulativesCELI}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("cotisationsCumulativesCELI", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>3. Votre paiement de maison</h3>
            <p className="section-copy">
              Entrez ici votre pret hypothecaire pour voir combien le paiement
              risque d'etre a chaque periode.
            </p>
            <div className="field-grid">
              <ChampNombre
                etiquette="Montant encore du sur l'hypotheque"
                valeur={etat.capitalHypotheque}
                pas={1000}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("capitalHypotheque", valeur)}
              />
              <ChampNombre
                etiquette="Taux d'interet"
                valeur={etat.tauxHypothecaire}
                pas={0.01}
                min={0}
                suffixe="%"
                onChange={(valeur) => mettreAJour("tauxHypothecaire", valeur)}
              />
              <ChampNombre
                etiquette="Nombre d'annees pour rembourser"
                valeur={etat.amortissementHypothecaire}
                pas={1}
                min={1}
                suffixe="ans"
                onChange={(valeur) => mettreAJour("amortissementHypothecaire", valeur)}
              />
              <ChampNombre
                etiquette="Nombre de paiements par an"
                valeur={etat.versementsParAnHypothecaire}
                pas={1}
                min={1}
                aide="12 = un paiement par mois. 26 = aux deux semaines."
                onChange={(valeur) => mettreAJour("versementsParAnHypothecaire", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>4. Faire grandir votre argent</h3>
            <p className="section-copy">
              Cette partie sert a estimer ce que votre epargne pourrait devenir
              avec le temps si vous continuez a ajouter de l'argent chaque annee.
            </p>
            <div className="field-grid">
              <ChampNombre
                etiquette="Montant deja accumule"
                valeur={etat.valeurInitialeProjection}
                pas={1000}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("valeurInitialeProjection", valeur)}
              />
              <ChampNombre
                etiquette="Montant ajoute chaque annee"
                valeur={etat.contributionAnnuelleProjection}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("contributionAnnuelleProjection", valeur)}
              />
              <ChampNombre
                etiquette="Croissance annuelle moyenne esperee"
                valeur={etat.rendementAnnuelProjection}
                pas={0.1}
                suffixe="%"
                aide="Si vous ne savez pas, gardez la valeur par defaut."
                onChange={(valeur) => mettreAJour("rendementAnnuelProjection", valeur)}
              />
              <ChampNombre
                etiquette="Pendant combien d'annees"
                valeur={etat.nombreAnneesProjection}
                pas={1}
                min={1}
                max={80}
                onChange={(valeur) => mettreAJour("nombreAnneesProjection", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>5. Utiliser votre argent plus tard</h3>
            <p className="section-copy">
              Cette partie simule une retraite simple: vous retirez un montant
              chaque annee et l'outil verifie si votre capital tient le coup.
            </p>
            <div className="field-grid">
              <ChampNombre
                etiquette="Montant disponible au debut de la retraite"
                valeur={etat.capitalInitialDecaissement}
                pas={1000}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("capitalInitialDecaissement", valeur)}
              />
              <ChampNombre
                etiquette="Montant retire la premiere annee"
                valeur={etat.retraitAnnuelInitialDecaissement}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("retraitAnnuelInitialDecaissement", valeur)}
              />
              <ChampNombre
                etiquette="Croissance annuelle moyenne du capital"
                valeur={etat.rendementAnnuelDecaissement}
                pas={0.1}
                suffixe="%"
                onChange={(valeur) => mettreAJour("rendementAnnuelDecaissement", valeur)}
              />
              <ChampNombre
                etiquette="Hausse annuelle du montant retire"
                valeur={etat.indexationRetraitDecaissement}
                pas={0.1}
                suffixe="%"
                aide="Exemple: 2 % pour suivre grossierement l'inflation."
                onChange={(valeur) => mettreAJour("indexationRetraitDecaissement", valeur)}
              />
              <ChampNombre
                etiquette="Nombre d'annees a couvrir"
                valeur={etat.nombreAnneesDecaissement}
                pas={1}
                min={1}
                max={80}
                onChange={(valeur) => mettreAJour("nombreAnneesDecaissement", valeur)}
              />
            </div>
          </section>
        </div>

        <div className="panel panel-results">
          <div className="panel-header">
            <h2 className="section-title">Ce que vos chiffres veulent dire</h2>
            <span className="result-badge">Calcul en direct</span>
          </div>

          <div className="card-grid guide-grid">
            <CarteExplication
              titre="En bref sur votre revenu"
              texte={`Environ ${formatPourcentage(tauxPrelevementGlobal)} de votre salaire part en impots et cotisations dans ce scenario. ${calculerTexteCapaciteEpargne(revenuApresImpotEtCotisations)}`}
            />
            <CarteExplication
              titre="En bref sur votre hypotheque"
              texte={`Le paiement estime revient a environ ${formatMonetaire(equivalentMensuelHypotheque)} par mois. ${calculerTexteHypotheque(paiementHypothecaire, etat.versementsParAnHypothecaire)}`}
            />
            <CarteExplication
              titre="En bref sur la retraite"
              texte={calculerTexteDecaissement(
                simulationDecaissement.capitalEpuise,
                simulationDecaissement.anneeEpuisement,
              )}
            />
          </div>

          <div className="card-grid result-grid">
            <CarteResultat
              titre="Total des impots"
              valeur={formatMonetaire(totalImpot)}
              description="Montant estime qui partirait en impot federal et provincial."
              detail={`Federal ${formatMonetaire(impotFederal.impotNet)} + Quebec ${formatMonetaire(impotQuebec.impotNet)}`}
            />
            <CarteResultat
              titre="Autres retenues obligatoires"
              valeur={formatMonetaire(cotisations.totalPersonnel)}
              description="Montant estime des cotisations sur la paie."
              detail={`RRQ ${formatMonetaire(cotisations.rrqBase + cotisations.rrqSupplementaire1 + cotisations.rrqSupplementaire2)} | RQAP ${formatMonetaire(cotisations.rqap)} | AE ${formatMonetaire(cotisations.assuranceEmploi)}`}
            />
            <CarteResultat
              titre="Ce qu'il vous reste apres prelevements"
              valeur={formatMonetaire(revenuApresImpotEtCotisations)}
              description="Argent restant apres impots et cotisations, avant vos autres depenses de vie."
            />
            <CarteResultat
              titre="Nouvel espace REER estime"
              valeur={formatMonetaire(droitsREER)}
              description="Estimation de l'espace REER cree a partir du salaire de l'an dernier."
            />
            <CarteResultat
              titre="Espace CELI disponible"
              valeur={formatMonetaire(droitsCELI)}
              description="Montant que vous pourriez encore mettre dans votre CELI selon les donnees saisies."
            />
            <CarteResultat
              titre="Paiement hypothecaire"
              valeur={formatMonetaire(paiementHypothecaire)}
              description="Montant estime a chaque paiement."
              detail={`${etat.versementsParAnHypothecaire} paiements / an, soit environ ${formatMonetaire(equivalentMensuelHypotheque)} par mois`}
            />
            <CarteResultat
              titre="Valeur future de votre epargne"
              valeur={formatMonetaire(projection)}
              description="Montant que votre capital pourrait atteindre si ce rythme continue."
              detail={`Gain estime attribuable a la croissance: ${formatMonetaire(gainProjete)}`}
            />
            <CarteResultat
              titre="Capital restant a la fin"
              valeur={formatMonetaire(simulationDecaissement.capitalFinal)}
              description="Somme estimee qu'il resterait apres la periode de retraite choisie."
              detail={
                simulationDecaissement.capitalEpuise
                  ? `Capital epuise vers l'an ${simulationDecaissement.anneeEpuisement}.`
                  : "Capital encore positif a la fin de l'horizon."
              }
              tonalite={simulationDecaissement.capitalEpuise ? "alert" : "success"}
            />
          </div>

          <section className="card notes-card">
            <h3>Hypotheses de base utilisees</h3>
            <div className="notes-grid">
              <div>
                <span className="note-label">Inflation</span>
                <strong>{formatPourcentage(hypothesesIqpf2026.inflation * 100)}</strong>
              </div>
              <div>
                <span className="note-label">Croissance salariale</span>
                <strong>{formatPourcentage(hypothesesIqpf2026.croissanceSalaires * 100)}</strong>
              </div>
              <div>
                <span className="note-label">Actions canadiennes</span>
                <strong>{formatPourcentage(hypothesesIqpf2026.rendementNominal.actionsCanadiennes * 100)}</strong>
              </div>
              <div>
                <span className="note-label">Taux d'emprunt LT</span>
                <strong>{formatPourcentage(hypothesesIqpf2026.tauxEmprunt.hypotheseLongTerme * 100)}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <div className="panel-header">
            <h2 className="section-title">Graphiques faciles a lire</h2>
            <span className="result-badge">Vue d'ensemble</span>
          </div>
          <div className="chart-grid">
            <CarteGraphique
              titre="Ou va votre salaire"
              description="Ce graphique montre ce qui part en impots, en cotisations, et ce qu'il vous reste."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donneesVentilationFiscale}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="nom" tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Bar dataKey="montant" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CarteGraphique>

            <CarteGraphique
              titre="Comment votre epargne peut grandir"
              description="La ligne principale montre la valeur totale estimee de votre epargne avec le temps."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donneesProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="annee" tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="valeurFin"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={false}
                    name="Valeur finale"
                  />
                  <Line
                    type="monotone"
                    dataKey="croissance"
                    stroke="#b45309"
                    strokeWidth={2}
                    dot={false}
                    name="Croissance annuelle"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CarteGraphique>

            <CarteGraphique
              titre="Est-ce que votre argent durerait"
              description="La zone verte montre l'argent restant. La ligne orange montre ce que vous retirez chaque annee."
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donneesDecaissement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 64, 43, 0.12)" />
                  <XAxis dataKey="annee" tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fill: "#675b4f", fontSize: 12 }} />
                  <Tooltip formatter={(valeur: number | string) => formatMonetaire(Number(valeur))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="capitalFin"
                    stroke="#0f766e"
                    fill="rgba(15, 118, 110, 0.24)"
                    name="Capital restant"
                  />
                  <Line
                    type="monotone"
                    dataKey="retrait"
                    stroke="#b45309"
                    strokeWidth={2}
                    dot={false}
                    name="Retrait annuel"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CarteGraphique>
          </div>
        </div>
      </section>
    </main>
  );
}
