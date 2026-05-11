# Outil personnel de planification financiere

Base de projet pour une application web locale de planification financiere Quebec / Canada, orientee precision du moteur de calcul avant l'interface.

## Etat actuel

Cette livraison pose une V1 de fondation :

- structure Vite + React + TypeScript ;
- moteur de calcul pur dans `src/engine/` ;
- donnees 2025 / 2026 versionnees dans `src/data/` ;
- premiers modules fiscaux 2025 pour le federal, le Quebec et les cotisations sociales ;
- table FERR minimale officielle ;
- hypotheses IQPF 2026 verifiees ;
- premiers tests Vitest.

## Limitations connues

- Le moteur fiscal livre ici est volontairement conservateur : il couvre surtout le cas d'un salarie resident du Quebec avec revenu d'emploi, deduction REER simple et cotisations sociales 2025.
- Les credits complexes demandes dans le cahier des charges (montant pour conjoint, frais medicaux, dons, dividendes QC, fractionnement, recuperation PSV, SRG, TEMI complet) ne sont pas encore finalises.
- Quand une regle n'etait pas suffisamment verifiee dans cette passe, le code est structure pour l'accueillir sans pretendre a une exactitude non confirmee.

## Sources principales integrees

- CRA : taux et seuils federaux 2025, montant personnel de base, EI, TFSA, RRSP, RRIF
- Revenu Quebec : paliers 2025, montant personnel de base, RQAP
- Retraite Quebec : RRQ 2025
- Institut de planification financiere / FP Canada : Normes d'hypotheses de projection 2026

Les URLs officielles sont referencees dans les fichiers de donnees et les JSDoc du moteur.

## Structure

```text
src/
  components/
  data/
    assumptions-iqpf-2026.ts
    ferr-min-table.ts
    tax-2025.ts
  engine/
    accounts/
      rrsp.ts
      tfsa.ts
    mortgage/
      canadian-amortization.ts
    projections/
      net-worth.ts
    tax/
      federal.ts
      payroll.ts
      quebec.ts
      shared.ts
    types.ts
  App.tsx
  index.css
  main.tsx
tests/
  accounts/
  mortgage/
  tax/
```

## Scripts

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Priorites suivantes recommandees

1. Completer `src/data/tax-2025.ts` avec les credits detailes manquants.
2. Ajouter les cas de reference externes demandes par le cahier des charges.
3. Etendre `federal.ts` et `quebec.ts` aux dividendes, gains en capital et revenus de retraite.
4. Ajouter `oas-clawback.ts`, `marginal-rate.ts`, `decumulation.ts` et les pages React de saisie.

