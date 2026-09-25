<div align="center">


# Stickerly

**Des stickers en pâte à modeler pour illustrer tes albums photo, toujours dans le même style.**

</div>

Illustrer un album photo avec des stickers générés, c'est vite pénible : on réécrit le même prompt, on le retouche, on relance, on compare. Stickerly fait ce travail à ta place. Tu décris ton album, l'app propose des stickers, les génère dans **ton** style et te laisse les ajuster en une phrase.

Tout tourne en local, avec ta clé OpenAI. Les images sortent en PNG à fond transparent, prêtes à poser dans ton logiciel d'album ou à imprimer sur du papier autocollant.

## Fonctionnalités

- **Parcours guidé en 4 étapes** : thème → idées → génération → export.
- **Suggestions d'idées** adaptées au thème de l'album (lieux visités, plats, anecdotes).
- **Prompt dynamique** : ton style, la mise en page du type de sticker et ta description sont assemblés automatiquement. Tu peux toujours lire et modifier le prompt final.
- **Cohérence de style** : jusqu'à 3 de tes stickers existants sont joints à chaque génération comme exemples visuels.
- **Retouches en une phrase** : « plus simple », « texte plus gros », « sans contour blanc »… sans repartir de zéro.
- **Historique des versions** : chaque sticker garde toutes ses versions, tu choisis celle à garder.
- **Photos de référence** : pour que les figurines ressemblent vraiment aux personnes.
- **Export** : zip des favoris ou de tout l'album, en PNG transparents.
- **Coût affiché** pour chaque génération et pour l'album entier.

## Prérequis

- [Node.js](https://nodejs.org) 20.9 ou plus récent
- Une clé API [OpenAI](https://platform.openai.com/api-keys), sur un compte avec du crédit

## Démarrage

```bash
npm install
```

Crée un fichier `.env.local` à la racine (tu peux copier `.env.example`) :

```ini
OPENAI_API_KEY=sk-...
```

Puis lance le serveur :

```bash
npm run dev
```

L'app est sur http://localhost:3000.

> [!TIP]
> Pour découvrir l'interface sans dépenser un centime, ajoute `STICKERLY_FAKE_AI=1` dans `.env.local` : l'app renvoie tes images de référence au lieu d'appeler OpenAI.

## Comment ça marche

1. **Thème** — tu racontes l'album : lieux, personnes, moments forts, anecdotes. Plus c'est détaillé, plus les idées sont justes.
2. **Idées** — le bouton « Proposer » suggère des stickers adaptés. Tu peux aussi en ajouter à la main. Tu coches ceux à générer, après les avoir retouchés si besoin.
3. **Stickers** — la génération part par lots de 3 en parallèle. Sur chaque sticker : « Autre version » relance, « Ajuster » applique une consigne courte, l'étoile garde le sticker en favori.
4. **Export** — tu télécharges tes favoris, ou tout l'album, en un zip.

## Les types de stickers

| Type | À quoi ça sert | Exemple | Format |
| --- | --- | --- | --- |
| 📍 Badge de lieu | Vignette souvenir d'un lieu, avec son nom en bas | Florence, Porto, Giverny | 1248 × 1248 |
| 🔤 Titre de page | Bandeau horizontal : une phrase et une illustration | « Pause gourmande » | 2112 × 720 |
| 🍋 Petit motif | Un ou deux objets décoratifs, sans texte | Citron et glace, nénuphars | 1024 × 1024 |
| 🧑‍🤝‍🧑 Personnages | Les gens de l'album en figurines | « Éclipse à deux » | 1248 × 1248 |

Chaque type a sa propre mise en page dans le prompt : composition, place du texte, décor autour du nom.

## Ton style

La page **Mon style** rassemble tout ce qui ne change jamais d'un sticker à l'autre :

- **La description du style** (matière, lumière, palette, lettrage), ajoutée à chaque prompt.
- **Le modèle et la qualité** d'image.
- **Les exemples de référence** : les images du dossier `references/`, que tu classes par type. À chaque génération, jusqu'à 3 exemples du même type sont tirés au hasard et joints au prompt. C'est le plus efficace pour garder un rendu cohérent.

Pour ajouter des exemples, dépose des PNG dans `references/`, puis indique leur type dans « Mon style ».

> [!NOTE]
> Si un type n'a qu'un seul exemple, le modèle a tendance à en recopier des éléments (un accessoire, un décor). Deux ou trois exemples par type suffisent à éviter ça.

## Les photos de référence

Sur n'importe quel sticker, tu peux joindre jusqu'à 4 photos. Elles servent à la **ressemblance** : visage, cheveux, couleur de peau, lunettes, barbe. La tenue, la pose, les accessoires et le décor suivent ta description dès que tu les précises, même si la photo montre autre chose.

## Modèles et coûts

| Usage | Modèle | Ordre de grandeur |
| --- | --- | --- |
| Images | `gpt-image-2.5-flare` (défaut) ou `gpt-image-2.5-sunburst` | 0,06 à 0,10 $ par sticker en qualité haute, 0,03 $ par retouche |
| Idées | `gpt-5.6-luna` | négligeable |

Le coût estimé de chaque version est affiché dans le panneau « Prompt » du sticker, et le total de l'album dans l'étape « Export ». Compte 15 à 40 secondes par image.

> [!TIP]
> La qualité « Brouillon » (dans « Mon style ») permet de tester une idée pour quelques centimes, avant de relancer la bonne en qualité haute.

## Configuration

| Variable | Rôle |
| --- | --- |
| `OPENAI_API_KEY` | Ta clé API OpenAI. Obligatoire. |
| `OPENAI_TEXT_MODEL` | Modèle texte des suggestions d'idées. Par défaut `gpt-5.6-luna`. |
| `STICKERLY_FAKE_AI` | À `1`, mode démo sans aucun appel à OpenAI. |

Le reste (style, modèle d'image, qualité, exemples) se règle dans l'app, page « Mon style ».

## Structure du projet

```
app/
  page.tsx              Accueil : liste des albums
  albums/[id]/          Espace de travail d'un album
  style/                Réglages du style
  api/                  Routes : albums, idées, génération, photos, export, réglages
components/             Interface (workspace, cartes, formulaires)
lib/
  prompt.ts             Construction du prompt : style + type de sticker + description
  ai.ts                 Appels OpenAI (images et idées) et estimation des coûts
  storage.ts            Stockage local des albums, images et réglages
  image.ts              Nettoyage de la transparence des PNG
references/             Tes stickers existants, utilisés comme exemples de style
data/                   Albums, images générées, photos, réglages (ignoré par git)
```

## Dépannage

> [!IMPORTANT]
> **« Clé OpenAI manquante »** : vérifie que `.env.local` existe à la racine, contient `OPENAI_API_KEY=sk-...`, puis relance `npm run dev`.

- **« Refusé par la modération »** : une formulation a déplu au filtre d'OpenAI. Reformule le sujet ou la légende, souvent un mot suffit.
- **« Limite OpenAI atteinte »** : trop de générations d'affilée, ou crédit épuisé. Attends un peu, ou vérifie le solde de ton compte.
- **Le texte du sticker est mal orthographié** : relance avec « Autre version », ou utilise « Ajuster » en citant la correction exacte.
- **Un élément d'un autre sticker apparaît** : le modèle a recopié un exemple de référence. Ajoute d'autres exemples de ce type dans « Mon style ».

> [!WARNING]
> Tout est stocké dans `data/`, sur ta machine, sans authentification. L'app est pensée pour tourner en local : ne la déploie pas telle quelle sur Internet.
