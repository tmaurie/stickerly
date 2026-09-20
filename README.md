# Stickerly

Petite app locale pour générer les stickers « pâte à modeler 3D » des albums photo, toujours dans le même style, sans réécrire de prompt à chaque fois.

## Démarrage

1. Installer les dépendances : `npm install`
2. Copier `.env.example` en `.env.local` et y mettre ta clé OpenAI (`OPENAI_API_KEY=sk-…`)
3. Lancer `npm run dev` puis ouvrir http://localhost:3000

## Le parcours

1. **Thème** : tu décris l'album (lieux, personnes, anecdotes).
2. **Idées** : le bouton « Proposer » suggère des stickers adaptés au thème. Tu peux aussi en ajouter à la main. Tu coches, tu retouches, puis « Générer ».
3. **Stickers** : chaque sticker peut être régénéré (« Autre version »), retouché en une phrase (« Ajuster » : plus simple, sans texte…), ou mis en favori. Toutes les versions restent accessibles.
4. **Export** : zip des favoris (ou de tout l'album), en PNG à fond transparent.

## Les 4 types de stickers

| Type | Exemple | Format |
| --- | --- | --- |
| 📍 Badge de lieu | Florence, Porto, Giverny | carré |
| 🔤 Titre de page | « Pause gourmande », « Chartres de nuit » | bandeau 3:1 |
| 🍋 Petit motif | citron + glace, nénuphars | carré |
| 🧑‍🤝‍🧑 Personnages | « Éclipse à deux » (avec photo de référence) | carré |

## Comment le prompt est construit

`lib/prompt.ts` assemble, pour chaque sticker :

- la mise en page du type (badge, titre, motif, personnages) ;
- le sujet, le texte et les détails saisis dans l'app ;
- **ton style** (modifiable dans la page « Mon style ») ;
- le contour blanc découpé (ou non) et le fond transparent ;
- le contexte de l'album.

En plus, jusqu'à 3 stickers de `references/` du même type sont joints comme exemples visuels, ce qui garde le rendu cohérent. Pour ajouter des exemples, dépose des PNG dans `references/`, puis choisis leur type dans « Mon style ».

Le prompt final est visible et modifiable sur chaque sticker (bouton « Prompt »).

## Données

Tout est stocké en local dans `data/` (ignoré par git) : albums, images générées, photos de référence, réglages.

## Modèles et coûts

- Images : `gpt-image-2.5-flare` par défaut, `gpt-image-2.5-sunburst` disponible dans « Mon style ».
- Idées : `gpt-5.6-luna` (modifiable via `OPENAI_TEXT_MODEL`).
- Le coût estimé de chaque version est affiché (dans « Prompt »), et le total de l'album dans « Export ».

## Mode démo

`STICKERLY_FAKE_AI=1` dans `.env.local` : aucun appel à OpenAI, l'app renvoie tes images de référence. Pratique pour tester l'interface.
