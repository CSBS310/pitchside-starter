import { describe, expect, it } from 'vitest';
import { roundRobin } from '../src/schedule/roundRobin.js';

const SIX = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const EIGHT = [...SIX, 'T7', 'T8'];

function key(a: string, b: string): string {
  return [a, b].sort().join('-');
}

describe('roundRobin', () => {
  it('makes n-1 rounds of n/2 pairings for an even count', () => {
    const rounds = roundRobin(SIX);
    expect(rounds).toHaveLength(5);
    for (const round of rounds) {
      expect(round.pairings).toHaveLength(3);
      expect(round.byeTeamId).toBeUndefined();
    }
  });

  it('plays every pair exactly once (R1)', () => {
    const seen = new Map<string, number>();
    for (const round of roundRobin(EIGHT)) {
      for (const p of round.pairings) {
        const k = key(p.homeId, p.awayId);
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    expect(seen.size).toBe((EIGHT.length * (EIGHT.length - 1)) / 2);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it('never schedules a team twice in one round', () => {
    for (const round of roundRobin(EIGHT)) {
      const ids = round.pairings.flatMap((p) => [p.homeId, p.awayId]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives each team a mix of home and away games (R4, best effort)', () => {
    const home = new Map<string, number>();
    for (const round of roundRobin(EIGHT)) {
      for (const p of round.pairings) {
        home.set(p.homeId, (home.get(p.homeId) ?? 0) + 1);
      }
    }
    for (const id of EIGHT) {
      const n = home.get(id) ?? 0;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('returns no rounds for fewer than two teams', () => {
    expect(roundRobin([])).toEqual([]);
    expect(roundRobin(['T1'])).toHaveLength(1);
    expect(roundRobin(['T1'])[0].pairings).toEqual([]);
  });
});
