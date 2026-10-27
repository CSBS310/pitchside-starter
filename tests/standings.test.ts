import { describe, expect, it } from 'vitest';
import { computeStandings, tally } from '../src/league/standings.js';
import { fixture, league, result, SIX } from './support.js';

const [otters, herons, marmots, sockeye] = SIX;

function names(table: ReturnType<typeof computeStandings>): string[] {
  return table.map((s) => SIX.find((t) => t.id === s.teamId)?.name ?? s.teamId);
}

describe('tally', () => {
  it('starts every team on zero', () => {
    const rows = tally(SIX, [], []);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({
      teamId: 'T1',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  });

  it('credits a win, a loss and the goals to both sides', () => {
    const rows = tally(SIX, [fixture('F1', otters.id, herons.id)], [result('F1', 3, 1)]);
    expect(rows[0]).toMatchObject({ played: 1, won: 1, lost: 0, goalsFor: 3, goalsAgainst: 1 });
    expect(rows[1]).toMatchObject({ played: 1, won: 0, lost: 1, goalsFor: 1, goalsAgainst: 3 });
  });

  it('counts a draw for both sides', () => {
    const rows = tally(SIX, [fixture('F1', otters.id, herons.id)], [result('F1', 2, 2)]);
    expect(rows[0]).toMatchObject({ drawn: 1, won: 0, lost: 0 });
    expect(rows[1]).toMatchObject({ drawn: 1, won: 0, lost: 0 });
  });

  it('ignores a result whose fixture or teams are unknown', () => {
    const rows = tally(SIX, [fixture('F1', otters.id, 'T99')], [result('F1', 1, 0), result('F2', 5, 5)]);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });
});

describe('computeStandings', () => {
  it('awards 3 for a win and 1 for a draw (R5)', () => {
    const table = computeStandings(
      league({
        teams: SIX,
        fixtures: [fixture('F1', otters.id, herons.id), fixture('F2', marmots.id, sockeye.id)],
        results: [result('F1', 1, 0), result('F2', 2, 2)],
      }),
    );
    const points = Object.fromEntries(table.map((s) => [s.teamId, s.points]));
    expect(points).toMatchObject({ T1: 3, T2: 0, T3: 1, T4: 1 });
  });

  it('breaks equal points by goal difference, then goals for (R6)', () => {
    const table = computeStandings(
      league({
        teams: SIX,
        fixtures: [
          fixture('F1', otters.id, herons.id),
          fixture('F2', marmots.id, sockeye.id),
          fixture('F3', SIX[4].id, SIX[5].id),
        ],
        // Otters +1 (GF 1), Marmots +3, Lumberjacks +1 (GF 4): Marmots, Lumberjacks, Otters.
        results: [result('F1', 1, 0), result('F2', 3, 0), result('F3', 4, 3)],
      }),
    );
    expect(names(table).slice(0, 3)).toEqual(['Marmots', 'Lumberjacks', 'Otters']);
  });

  it('falls back to team name when nothing else separates teams', () => {
    const table = computeStandings(league({ teams: SIX }));
    expect(names(table)).toEqual(['Herons', 'Lumberjacks', 'Marmots', 'Otters', 'Sea Lions', 'Sockeye']);
  });

  it('breaks a two-way tie on the head-to-head result (R6)', () => {
    // Otters and Herons both beat Marmots 2-0 and drew with Sockeye; the match
    // between them settles it.
    const table = computeStandings(
      league({
        teams: SIX,
        fixtures: [
          fixture('F1', otters.id, marmots.id),
          fixture('F2', herons.id, marmots.id),
          fixture('F3', otters.id, sockeye.id),
          fixture('F4', herons.id, sockeye.id),
          fixture('F5', otters.id, herons.id),
        ],
        results: [result('F1', 2, 0), result('F2', 2, 0), result('F3', 1, 1), result('F4', 1, 1), result('F5', 0, 2)],
      }),
    );
    expect(names(table).slice(0, 2)).toEqual(['Herons', 'Otters']);
  });

  it('places the head-to-head winner above the loser when they are level', () => {
    // Marmots 2-1 Lumberjacks, Sockeye win at Marmots, Lumberjacks beat Sea Lions:
    // Sockeye lead on goal difference; Marmots and Lumberjacks are level behind.
    const table = computeStandings(
      league({
        teams: SIX,
        fixtures: [
          fixture('F1', marmots.id, SIX[4].id),
          fixture('F2', marmots.id, sockeye.id),
          fixture('F3', SIX[4].id, SIX[5].id),
        ],
        results: [result('F1', 2, 1), result('F2', 1, 2), result('F3', 2, 1)],
      }),
    );
    expect(names(table).slice(0, 3)).toEqual(['Sockeye', 'Lumberjacks', 'Marmots']);
  });

  it('does not use head-to-head when three teams are level', () => {
    // Three teams with one 1-0 win each over the other side: all level, so name order.
    const table = computeStandings(
      league({
        teams: SIX,
        fixtures: [
          fixture('F1', otters.id, herons.id),
          fixture('F2', herons.id, marmots.id),
          fixture('F3', marmots.id, otters.id),
        ],
        results: [result('F1', 1, 0), result('F2', 1, 0), result('F3', 1, 0)],
      }),
    );
    expect(names(table).slice(0, 3)).toEqual(['Herons', 'Marmots', 'Otters']);
  });

});
