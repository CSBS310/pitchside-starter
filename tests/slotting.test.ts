import { describe, expect, it } from 'vitest';
import { DomainError } from '../src/domain/errors.js';
import type { RoundPlan } from '../src/domain/types.js';
import { nightOf, slotRounds } from '../src/schedule/slotting.js';
import { SETTINGS } from './support.js';

function plan(number: number, count: number, byeTeamId?: string): RoundPlan {
  const pairings = Array.from({ length: count }, (_, i) => ({
    homeId: `R${number}H${i}`,
    awayId: `R${number}A${i}`,
  }));
  return { number, byeTeamId, pairings };
}

describe('slotRounds', () => {
  it('fills a night court by court, then slot by slot (R3)', () => {
    const { fixtures } = slotRounds([plan(1, 3)], SETTINGS);
    expect(fixtures.map((f) => `${f.slot} ${f.court}`)).toEqual([
      '2026-11-18T18:00 A',
      '2026-11-18T18:00 B',
      '2026-11-18T19:00 A',
    ]);
  });

  it('puts a second round on the same night when it fits', () => {
    const { fixtures } = slotRounds([plan(1, 3), plan(2, 3)], SETTINGS);
    expect(fixtures.every((f) => nightOf(f.slot) === '2026-11-18')).toBe(true);
    expect(fixtures.filter((f) => f.round === 2).map((f) => f.slot)).toEqual([
      '2026-11-18T19:00',
      '2026-11-18T20:00',
      '2026-11-18T20:00',
    ]);
  });

  it('spills a round that does not fit into the next night without splitting it', () => {
    const { fixtures } = slotRounds([plan(1, 4), plan(2, 4)], SETTINGS);
    const nights = fixtures.map((f) => [f.round, nightOf(f.slot)]);
    expect(nights.filter(([r]) => r === 1).every(([, n]) => n === '2026-11-18')).toBe(true);
    expect(nights.filter(([r]) => r === 2).every(([, n]) => n === '2026-11-25')).toBe(true);
  });

  it('carries the bye through to the round record', () => {
    const { rounds } = slotRounds([plan(1, 3, 'T9'), plan(2, 3)], SETTINGS);
    expect(rounds).toEqual([
      { number: 1, byeTeamId: 'T9' },
      { number: 2, byeTeamId: undefined },
    ]);
  });

  it('rejects a round with more matches than a night holds', () => {
    expect(() => slotRounds([plan(1, 7)], SETTINGS)).toThrowError(DomainError);
    expect(() => slotRounds([plan(1, 7)], SETTINGS)).toThrowError(/holds 6/);
  });

  it('rejects a schedule with more rounds than the nights can take', () => {
    const settings = { ...SETTINGS, matchNights: ['2026-11-18'] };
    const plans = [plan(1, 4), plan(2, 4)];
    expect(() => slotRounds(plans, settings)).toThrowError(/do not fit/);
  });
});
