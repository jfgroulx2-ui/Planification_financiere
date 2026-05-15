import { hypothesesIqpf2026 } from "./data/assumptions-iqpf-2026";
import { calculerDroitsREER } from "./engine/accounts/rrsp";
import { calculerDroitsCELIDisponibles } from "./engine/accounts/tfsa";
import { calculerPaiementHypothecaireCanadien } from "./engine/mortgage/canadian-amortization";
import { projeterPatrimoineAnnuel } from "./engine/projections/net-worth";
import { calculerImpotFederal2025 } from "./engine/tax/federal";
import { calculerCotisationsSociales2025 } from "./engine/tax/payroll";
import { calculerImpotQuebec2025 } from "./engine/tax/quebec";

function formatMonetaire(valeur: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(valeur);
}

export default function App() {
  const cotisations = calculerCotisationsSociales2025({ revenuTravail: 100000 });
  const impotFederal = calculerImpotFederal2025({
    revenuEmploi: 100000,
    resideAuQuebec: true,
    cotisationsSociales: cotisations,
  });
  const impotQuebec = calculerImpotQuebec2025({
    revenuEmploi: 100000,
    cotisationsSociales: cotisations,
  });
  const droitsCELI = calculerDroitsCELIDisponibles({
    anneeCourante: 2026,
    anneeNaissance: 1990,
  });
  const droitsREER = calculerDroitsREER({
    revenuGagneAnneePrecedente: 100000,
  });
  const paiementHypothecaire = calculerPaiementHypothecaireCanadien({
    capitalInitial: 500000,
    tauxNominalAnnuel: 0.0525,
    anneesAmortissement: 25,
    versementsParAn: 12,
  });
  const projection = projeterPatrimoineAnnuel({
    valeurInitiale: 250000,
    contributionAnnuelle: 18000,
    rendementAnnuel: hypothesesIqpf2026.rendementNominal.actionsCanadiennes,
    nombreAnnees: 30,
  });

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="status-pill">Base locale axee moteur de calcul</span>
        <h1>Planification financiere Quebec / Canada</h1>
        <p>
          Cette base privilegie la reproductibilite des calculs, la separation
          nette entre donnees fiscales et moteur pur, et l'ajout progressif de
          tests de reference externes.
        </p>
        <p className="warning">
          Les modules fiscaux livres ici couvrent surtout le cas initial d'un
          salarie resident du Quebec. Les credits et situations plus complexes
          sont prevus mais pas encore tous finalises.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Apercu moteur</h2>
        <div className="card-grid">
          <article className="card">
            <h3>Fiscalite simple 2025</h3>
            <p className="metric">{formatMonetaire(impotFederal.impotNet + impotQuebec.impotNet)}</p>
            <p>
              Impot net estime sur 100 000 $ de revenu d'emploi au Quebec,
              hors credits complexes additionnels.
            </p>
          </article>

          <article className="card">
            <h3>Cotisations sociales</h3>
            <p className="metric">{formatMonetaire(cotisations.totalPersonnel)}</p>
            <p>RRQ, RQAP et AE 2025 pour un salaire de 100 000 $.</p>
          </article>

          <article className="card">
            <h3>Droits CELI 2026</h3>
            <p className="metric">{formatMonetaire(droitsCELI)}</p>
            <p>Scenario exemple: naissance en 1990, admissibilite complete.</p>
          </article>

          <article className="card">
            <h3>Nouveaux droits REER</h3>
            <p className="metric">{formatMonetaire(droitsREER)}</p>
            <p>18 % du revenu gagne precedent, sous le plafond officiel 2025.</p>
          </article>

          <article className="card">
            <h3>Paiement hypothecaire</h3>
            <p className="metric">{formatMonetaire(paiementHypothecaire)}</p>
            <p>500 000 $, 5,25 %, amortissement 25 ans, paiements mensuels.</p>
          </article>

          <article className="card">
            <h3>Projection 30 ans</h3>
            <p className="metric">{formatMonetaire(projection)}</p>
            <p>
              Base analytique a rendement constant selon l'hypothese actions
              canadiennes IQPF 2026.
            </p>
          </article>
        </div>
      </section>

      <section className="section card">
        <h2 className="section-title">Hypotheses IQPF 2026 chargees</h2>
        <ul>
          <li>Inflation: {(hypothesesIqpf2026.inflation * 100).toFixed(1)} %</li>
          <li>
            Croissance salariale: {(hypothesesIqpf2026.croissanceSalaires * 100).toFixed(1)} %
          </li>
          <li>
            Rendement actions canadiennes: {(hypothesesIqpf2026.rendementNominal.actionsCanadiennes * 100).toFixed(1)} %
          </li>
          <li>
            Taux d'emprunt long terme: {(hypothesesIqpf2026.tauxEmprunt.hypotheseLongTerme * 100).toFixed(2)} %
          </li>
        </ul>
      </section>
    </main>
  );
}
