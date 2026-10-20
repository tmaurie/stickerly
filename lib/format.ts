/** The whole UI renders inside a `lang="fr"` document, so amounts take a comma. */
export function formatUsd(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} $`;
}
