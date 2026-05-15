import { useMemo, useState } from "react";
import { hypothesesIqpf2026 } from "./data/assumptions-iqpf-2026";
import { calculerDroitsREER } from "./engine/accounts/rrsp";
import { calculerDroitsCELIDisponibles } from "./engine/accounts/tfsa";
import { calculerPaiementHypothecaireCanadien } from "./engine/mortgage/canadian-amortization";
import { projeterPatrimoineAnnuel } from "./engine/projections/net-worth";
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
};

function formatMonetaire(valeur: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(valeur);
}

function formatPourcentage(valeur: number): string {
  return `${valeur.toFixed(2)} %`;
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
}

function CarteResultat({ titre, valeur, description, detail }: CarteResultatProps) {
  return (
    <article className="card result-card">
      <h3>{titre}</h3>
      <p className="metric">{valeur}</p>
      <p>{description}</p>
      {detail ? <p className="result-detail">{detail}</p> : null}
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

  const totalImpot = impotFederal.impotNet + impotQuebec.impotNet;
  const revenuApresImpotEtCotisations =
    etat.revenuEmploi - totalImpot - cotisations.totalPersonnel;

  function mettreAJour<K extends keyof EtatSaisie>(cle: K, valeur: EtatSaisie[K]) {
    setEtat((etatCourant) => ({
      ...etatCourant,
      [cle]: valeur,
    }));
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="status-pill">Interface de saisie connectee au moteur</span>
        <h1>Planification financiere Quebec / Canada</h1>
        <p>
          Cette version permet enfin d&apos;entrer vos propres donnees et de
          recalculer en direct les resultats deja branches au moteur fiscal et
          financier.
        </p>
        <p className="warning">
          Les modules restent encore centres sur un cas Quebec salarie assez
          simple. L&apos;interface est maintenant interactive, mais la precision du
          moteur evoluera encore sur les credits complexes et les scenarios de
          retraite.
        </p>
      </section>

      <section className="workspace section">
        <div className="panel panel-form">
          <div className="panel-header">
            <h2 className="section-title">Saisie</h2>
            <button className="secondary-button" type="button" onClick={() => setEtat(etatInitial)}>
              Reinitialiser
            </button>
          </div>

          <section className="form-section">
            <h3>Fiscalite et cotisations</h3>
            <div className="field-grid">
              <ChampNombre
                etiquette="Revenu d'emploi"
                valeur={etat.revenuEmploi}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("revenuEmploi", valeur)}
              />
              <ChampNombre
                etiquette="Deduction REER"
                valeur={etat.deductionREER}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("deductionREER", valeur)}
              />
              <ChampNombre
                etiquette="Revenu gagne annee precedente"
                valeur={etat.revenuGagneAnneePrecedente}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("revenuGagneAnneePrecedente", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>CELI</h3>
            <div className="field-grid">
              <ChampNombre
                etiquette="Annee courante"
                valeur={etat.anneeCouranteCELI}
                min={2009}
                max={2100}
                onChange={(valeur) => mettreAJour("anneeCouranteCELI", valeur)}
              />
              <ChampNombre
                etiquette="Annee de naissance"
                valeur={etat.anneeNaissanceCELI}
                min={1900}
                max={2100}
                onChange={(valeur) => mettreAJour("anneeNaissanceCELI", valeur)}
              />
              <ChampNombre
                etiquette="Annee d'arrivee au Canada"
                valeur={etat.anneeArriveeCanadaCELI}
                min={1900}
                max={2100}
                onChange={(valeur) => mettreAJour("anneeArriveeCanadaCELI", valeur)}
              />
              <ChampNombre
                etiquette="Droits reportes"
                valeur={etat.droitsReportesCELI}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("droitsReportesCELI", valeur)}
              />
              <ChampNombre
                etiquette="Retraits annee precedente"
                valeur={etat.retraitsAnneePrecedenteCELI}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("retraitsAnneePrecedenteCELI", valeur)}
              />
              <ChampNombre
                etiquette="Cotisations cumulatives"
                valeur={etat.cotisationsCumulativesCELI}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("cotisationsCumulativesCELI", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>Hypotheque</h3>
            <div className="field-grid">
              <ChampNombre
                etiquette="Capital"
                valeur={etat.capitalHypotheque}
                pas={1000}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("capitalHypotheque", valeur)}
              />
              <ChampNombre
                etiquette="Taux nominal annuel"
                valeur={etat.tauxHypothecaire}
                pas={0.01}
                min={0}
                suffixe="%"
                onChange={(valeur) => mettreAJour("tauxHypothecaire", valeur)}
              />
              <ChampNombre
                etiquette="Amortissement"
                valeur={etat.amortissementHypothecaire}
                pas={1}
                min={1}
                suffixe="ans"
                onChange={(valeur) => mettreAJour("amortissementHypothecaire", valeur)}
              />
              <ChampNombre
                etiquette="Versements par an"
                valeur={etat.versementsParAnHypothecaire}
                pas={1}
                min={1}
                aide="12 = mensuel, 26 = aux deux semaines"
                onChange={(valeur) => mettreAJour("versementsParAnHypothecaire", valeur)}
              />
            </div>
          </section>

          <section className="form-section">
            <h3>Projection de patrimoine</h3>
            <div className="field-grid">
              <ChampNombre
                etiquette="Valeur initiale"
                valeur={etat.valeurInitialeProjection}
                pas={1000}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("valeurInitialeProjection", valeur)}
              />
              <ChampNombre
                etiquette="Contribution annuelle"
                valeur={etat.contributionAnnuelleProjection}
                pas={100}
                min={0}
                suffixe="$"
                onChange={(valeur) => mettreAJour("contributionAnnuelleProjection", valeur)}
              />
              <ChampNombre
                etiquette="Rendement annuel"
                valeur={etat.rendementAnnuelProjection}
                pas={0.1}
                suffixe="%"
                aide="Ex.: 6,3 pour 6,3 %"
                onChange={(valeur) => mettreAJour("rendementAnnuelProjection", valeur)}
              />
              <ChampNombre
                etiquette="Nombre d'annees"
                valeur={etat.nombreAnneesProjection}
                pas={1}
                min={1}
                max={80}
                onChange={(valeur) => mettreAJour("nombreAnneesProjection", valeur)}
              />
            </div>
          </section>
        </div>

        <div className="panel panel-results">
          <div className="panel-header">
            <h2 className="section-title">Resultats</h2>
            <span className="result-badge">Calcul en direct</span>
          </div>

          <div className="card-grid result-grid">
            <CarteResultat
              titre="Impot net total"
              valeur={formatMonetaire(totalImpot)}
              description="Somme de l'impot federal et de l'impot du Quebec selon les regles simplifiees branchees."
              detail={`Federal ${formatMonetaire(impotFederal.impotNet)} + Quebec ${formatMonetaire(impotQuebec.impotNet)}`}
            />
            <CarteResultat
              titre="Cotisations sociales"
              valeur={formatMonetaire(cotisations.totalPersonnel)}
              description="RRQ, RQAP et AE 2025 sur le revenu d'emploi saisi."
              detail={`RRQ base ${formatMonetaire(cotisations.rrqBase)} | RRQ supp. 1 ${formatMonetaire(cotisations.rrqSupplementaire1)} | RRQ supp. 2 ${formatMonetaire(cotisations.rrqSupplementaire2)}`}
            />
            <CarteResultat
              titre="Revenu apres impot"
              valeur={formatMonetaire(revenuApresImpotEtCotisations)}
              description="Revenu d'emploi moins impot net total et cotisations personnelles."
            />
            <CarteResultat
              titre="Nouveaux droits REER"
              valeur={formatMonetaire(droitsREER)}
              description="Calcul selon 18 % du revenu gagne precedent, sous le plafond 2025."
            />
            <CarteResultat
              titre="Droits CELI disponibles"
              valeur={formatMonetaire(droitsCELI)}
              description="Accumulation historique, reports, retraits de l'annee precedente et cotisations cumulatives."
            />
            <CarteResultat
              titre="Paiement hypothecaire"
              valeur={formatMonetaire(paiementHypothecaire)}
              description="Paiement par periode selon capitalisation semi-annuelle canadienne."
              detail={`${etat.versementsParAnHypothecaire} versements / an a ${formatPourcentage(etat.tauxHypothecaire)}`}
            />
            <CarteResultat
              titre="Projection future"
              valeur={formatMonetaire(projection)}
              description="Projection analytique a rendement constant avec contributions en fin d'annee."
              detail={`${etat.nombreAnneesProjection} ans a ${formatPourcentage(etat.rendementAnnuelProjection)}`}
            />
          </div>

          <section className="card notes-card">
            <h3>Hypotheses IQPF 2026</h3>
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
    </main>
  );
}
