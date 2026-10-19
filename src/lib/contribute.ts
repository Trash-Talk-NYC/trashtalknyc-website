/**
 * The homepage Contribute section's brag line (captain, 2026-10-19):
 * "Trash Talk NYC has raised {amount} since starting in May 2026."
 *
 * TODO(captain): fill in the amount raised, written the way it should read
 * (for example "$59,800"). While it is empty the sentence is not shown at
 * all, so the page never claims a number nobody has confirmed.
 */
export const TODO_RAISED_AMOUNT = '';

type Copy = { en: string; es: string };

/** The sentence for an amount, or null while no amount is set. */
export function raisedSentence(amount: string = TODO_RAISED_AMOUNT): Copy | null {
  const value = amount.trim();
  if (!value) return null;
  return {
    en: `Trash Talk NYC has raised ${value} since starting in May 2026.`,
    es: `Trash Talk NYC ha recaudado ${value} desde que empezó en mayo de 2026.`,
  };
}
