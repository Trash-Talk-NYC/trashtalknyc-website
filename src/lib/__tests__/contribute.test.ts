import { describe, expect, it } from 'vitest';
import { TODO_RAISED_AMOUNT, raisedSentence } from '../contribute';

describe('raisedSentence', () => {
  it('stays hidden while no amount is set', () => {
    expect(raisedSentence('')).toBeNull();
    expect(raisedSentence('   ')).toBeNull();
  });

  it('reads the amount into both languages', () => {
    expect(raisedSentence(' $59,800 ')).toEqual({
      en: 'Trash Talk NYC has raised $59,800 since starting in May 2026.',
      es: 'Trash Talk NYC ha recaudado $59,800 desde que empezó en mayo de 2026.',
    });
  });

  it('uses the configured amount by default', () => {
    expect(raisedSentence()).toEqual(raisedSentence(TODO_RAISED_AMOUNT));
  });
});
