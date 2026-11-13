# AI E-COMMERCE AUTOMATION TEAM - Simulation

Application web interactive complète reproduisant le dashboard futuriste de la vidéo TikTok (@nolanpearson.ai).

## Fonctionnalités

- **5 équipes d'agents IA** : Research, Creative, Media Buying, Optimization, YOU
- Agents qui **travaillent réellement** : recherche de produits, création de pubs, lancement de campagnes, optimisation
- **Simulation financière dynamique** en euros : capital, CA, bénéfice net, ROAS, CPA, ventes, pertes
- Campagnes gagnantes ET perdantes
- Communication entre agents (produits → créatifs → campagnes → optimisations)
- START ALL / STOP ALL + contrôles individuels
- Approbations utilisateur pour décisions d'argent (scale/kill)
- Journal d'activité en direct
- Design néon noir/violet avec animations et personnages
- **100% simulation** - aucun argent réel

## Lancer l'application

1. Ouvrez un terminal dans ce dossier
2. Lancez un serveur local :
   ```bash
   python3 -m http.server 8080
   ```
3. Ouvrez http://localhost:8080 dans votre navigateur

Ou simplement ouvrez `index.html` (fonctionne aussi en file:// pour le test de base).

## Structure

- `index.html` : Interface principale
- `css/styles.css` : Design futuriste néon
- `js/simulation.js` : Moteur de simulation séparé (logique métier)

## Architecture future

Le moteur de simulation est indépendant de l'UI. Pour intégrer de vraies APIs plus tard (Shopify, Meta Ads, OpenAI, etc.) :

1. Remplacer les méthodes `doResearch()`, `doCreative()`, etc. par des appels API
2. Brancher sur une base de données (voir `schema.sql`)
3. Ajouter authentification et persistance

## Tests effectués

- Lancement individuel et START ALL
- Communication inter-équipes
- Campagnes live avec ventes/pertes
- Calculs financiers cohérents (ROAS, capital, etc.)
- Reset et configuration du capital
- Arrêt/reprise des agents

## Avertissement

Ceci est une **simulation purement fictive** destinée à tester l'intérêt du public (TikTok, Instagram, YouTube). Aucune connexion à des plateformes publicitaires ou e-commerce réelles. Aucun argent réel n'est impliqué.