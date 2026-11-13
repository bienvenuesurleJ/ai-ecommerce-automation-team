# AI Command Center

Simulation d'une équipe e-commerce pilotée par cinq agents : Research, Creative, Media Buying, Optimization et YOU.

**SIMULATION ONLY — NO REAL MONEY SPENT.** Aucune publicité réelle, aucun achat, aucun modèle d'IA externe. Le moteur est local et déterministe.

## Lancer

GitHub Pages sert `index.html`. En local :

```bash
python3 -m http.server 8080
```

## Ce que fait START ALL

Les robots s'activent, les missions avancent, les messages circulent, les campagnes virtuelles dépensent un budget simulé, et le grand livre (capital, CA, bénéfice, ROAS) se met à jour. Les décisions de scale / coupe passent par YOU.

## Sauvegarde

La session est stockée dans le navigateur. Export / import JSON dans Réglages.

## Sécurité

La version précédente est sur la branche `backup/pre-command-center`.

## Source

Le code lisible est dans `source/` (moteur, robots, salle de contrôle, styles). `schema.sql` reste le schéma prévu pour un futur backend. `app.js` est le bundle statique servi par Pages.
