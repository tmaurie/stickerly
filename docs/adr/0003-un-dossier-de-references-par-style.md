# Chaque Style possède son dossier d'Exemples de référence

Les Exemples de référence vivaient à plat dans `references/`, classés par une table de correspondance dans les réglages. Chaque Style possède désormais son dossier, `references/<styleId>/`, et sa propre table. Son enregistrement, lui, vit dans `data/styles.json` : `.gitignore` classe déjà `data/` comme état local, tandis que les images de référence sont de la matière choisie à la main qui mérite d'être versionnée — neuf d'entre elles l'étaient déjà.

Un Exemple de référence *est* le style : c'est un échantillon de son rendu. Le partager entre deux Styles tirerait le rendu de l'un dans l'autre, exactement la panne que le dépannage du README décrit — « un élément d'un autre sticker apparaît ». Un dossier par Style rend aussi la duplication et la suppression lisibles sur le disque.

## Conséquences

- La migration déplace seize fichiers vers `references/pate-a-modeler/`, dont neuf suivis par git (`git mv`, pour que l'historique suive). Elle est un script one-shot et non une dérivation à la lecture : déplacer des fichiers versionnés pendant un chargement de page serait indéfendable.
- La route devient `/api/references/[style]/[file]`, `isSafeName` interdisant la barre oblique dans un segment.
- Le README indique de déposer les PNG dans `references/` : à corriger vers le dossier du Style.
- Supprimer un Style **ne supprime pas** son dossier. Effacer sur un clic d'interface des images source choisies à la main et suivies par git n'est pas une chose que l'application s'autorise ; le dossier reste, orphelin, et le message de confirmation le dit.
- `styleId` est le slug du nom (`slugify`), figé à la création et suffixé en cas de collision. Ce dossier est un endroit que l'on ouvre à la main pour y déposer des PNG : il doit rester lisible, ce qui écarte un identifiant opaque, et `isSafeName` rejetterait de toute façon les accents d'un nom brut. Renommer un Style ne déplace donc pas son dossier, et son éditeur affiche le chemin pour que la correspondance reste visible.
