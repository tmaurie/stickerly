# Le Style se résout par Sticker, puis par Album

Un Style doit pouvoir changer « à chaque génération ». Plutôt qu'un Style globalement actif, la résolution descend la hiérarchie : `sticker.styleId ?? album.styleId ?? defaultStyleId`. L'Album est l'unité de cohérence — c'est le sujet même de l'application — et la surcharge optionnelle par Sticker donne le changement au coup par coup.

Le motif décisif est invisible dans le code. La génération n'est pas un lot mais une **file** côté client (`MAX_PARALLEL = 3` dans `AlbumWorkspace.tsx`) : une vingtaine de stickers s'écoulent trois par trois sur plusieurs minutes, chaque travail faisant son propre POST, et le serveur relit la configuration à chaque requête. Un Style globalement actif que l'on change pendant que la file s'écoule couperait donc la file en deux styles, sans trace et sans avertissement. En résolvant depuis la donnée stockée, chaque génération retrouve le Style de son Sticker quoi qu'il arrive entre-temps.

## Conséquences

- Chaque Version enregistre `styleId` **et** `styleName` dénormalisé : le nom survit à un renommage comme à une suppression du Style. Pas d'instantané complet du Style, le `prompt` déjà stocké contenant sa description mot pour mot.
- « Ajuster » résout son style depuis la Version ajustée, jamais depuis le Style courant du Sticker. Le prompt d'ajustement promet « applique uniquement ce changement » tout en passant l'image précédente en Image 1 : y injecter un autre style rendrait cette promesse fausse.
- `styleId` reste optionnel sur une Version, pour qu'une Version sans Style demeure représentable.
- `styleId` est immuable. Renommer un Style ne réécrit ni les Albums, ni les Stickers, ni l'historique gelé des Versions : un renommage est un geste cosmétique.
- La bibliothèque n'est jamais vide. Le dernier Style ne peut pas être supprimé, et supprimer le Style par défaut en promeut un autre, pour que toute résolution se termine et qu'aucun chemin de code n'ait à gérer un Style absent.
