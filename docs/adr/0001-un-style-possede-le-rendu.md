# Un Style possède le rendu, pas la composition ni le coût

En remplaçant les réglages globaux « Mon style » par une bibliothèque de Styles, il fallait décider ce qu'un Style possède. Un Style possède le **rendu** — sa description, ses Exemples de référence, son modèle d'image — et rien d'autre. La **composition** reste au Type de sticker (`KIND_TEMPLATES` et les tailles, en code), et la **qualité** reste un bouton de génération dont le Style ne fournit que le défaut.

Les quatre Types sont la grammaire de toute l'application : les règles d'idées, la lecture d'image, les champs du formulaire et les tailles sont tous indexés dessus. Les confier au Style multiplierait par quatre la surface d'édition de chaque Style et ferait de la page une pile de cinq prompts. Quant à la qualité, c'est une décision de coût et non de style : le flux documenté est « Brouillon pour tester à quelques centimes, puis relance en haute », et deux Styles qui ne diffèrent que par la qualité ne sont pas deux styles.

## Conséquences

- Si un Style réclame vraiment une autre mise en page, la porte de sortie retenue est qu'il *ajoute* une consigne par Type, sans jamais remplacer le gabarit. Un besoin plus profond est un nouveau Type, pas un champ de Style.
- Le corollaire dans `lib/ai.ts` : `CLAY_CONTEXT` codait le rendu pâte à modeler en dur dans les prompts d'idées et de lecture d'image, et `KIND_RULES` fixait jusqu'à la couleur des lettres et les « visages kawaii ». Ces détails sont du rendu : ils passent dans la description du Style résolu, et les règles de Type ne gardent que la composition et le sens des champs. Sans ça, un Style aquarelle produirait des idées rédigées en vocabulaire d'argile.
