import type { Fixture, League, LeagueSettings, Result, Standing, Team } from '../domain/types.js';

// The league table (R5, R6, R7). Standings are derived from results every time
// they are asked for; nothing here is ever written back to the repository.

/** A mutable tally row: a Standing before goal difference and points are derived. */
type Row = { -readonly [K in keyof Omit<Standing, 'goalDifference' | 'points'>]: Standing[K] };

function blankRow(teamId: string): Row {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
}

/** Add up played/won/drawn/lost and goals for every team. */
export function tally(teams: readonly Team[], fixtures: readonly Fixture[], results: readonly Result[]): Row[] {
  const rows = new Map<string, Row>();
  for (const team of teams) {
    rows.set(team.id, blankRow(team.id));
  }
  for (const result of results) {
    const fixture = fixtures.find((f) => f.id === result.fixtureId);
    if (fixture === undefined) {
      continue;
    }
    const home = rows.get(fixture.homeId);
    const away = rows.get(fixture.awayId);
    if (home === undefined || away === undefined) {
      continue;
    }
    home.played += 1;
    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;
    if (result.homeGoals > result.awayGoals) {
      home.won += 1;
    } else if (result.homeGoals === result.awayGoals) {
      home.drawn += 1;
    } else {
      home.lost += 1;
    }
    away.played += 1;
    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;
    if (result.awayGoals > result.homeGoals) {
      away.won += 1;
    } else if (result.awayGoals === result.homeGoals) {
      away.drawn += 1;
    } else {
      away.lost += 1;
    }
  }
  return [...rows.values()];
}

function toStanding(row: Row, settings: LeagueSettings): Standing {
  return {
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    points: row.won * settings.pointsForWin + row.drawn * settings.pointsForDraw,
  };
}

function nameOf(teams: readonly Team[], teamId: string): string {
  const team = teams.find((t) => t.id === teamId);
  return team === undefined ? teamId : team.name;
}

/** How many teams share this team's points, goal difference and goals for. */
function countLevel(a: Standing, all: readonly Standing[]): number {
  let level = 0;
  for (const s of all) {
    if (s.points === a.points && s.goalDifference === a.goalDifference && s.goalsFor === a.goalsFor) {
      level += 1;
    }
  }
  return level;
}

function involves(fixture: Fixture | undefined, a: Standing, b: Standing): boolean {
  if (fixture === undefined) {
    return false;
  }
  return (
    (fixture.homeId === a.teamId && fixture.awayId === b.teamId) ||
    (fixture.homeId === b.teamId && fixture.awayId === a.teamId)
  );
}

/**
 * Order two rows by R6: points, goal difference, goals for, head-to-head (only
 * when exactly two teams are level on all three), then name. Negative means
 * `a` is placed above `b`.
 */
export function compareStandings(
  a: Standing,
  b: Standing,
  all: readonly Standing[],
  fixtures: readonly Fixture[],
  results: readonly Result[],
  teams: readonly Team[],
): number {
  if (a.points !== b.points) {
    return b.points - a.points;
  }
  if (a.goalDifference !== b.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }
  if (a.goalsFor !== b.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }
  if (countLevel(a, all) === 2) {
    // Head-to-head: whoever won the match between the two goes above.
    for (const result of results) {
      const fixture = fixtures.find((f) => f.id === result.fixtureId);
      if (!involves(fixture, a, b)) {
        continue;
      }
      if (result.homeGoals > result.awayGoals) {
        return -1;
      }
      if (result.homeGoals < result.awayGoals) {
        return 1;
      }
    }
  }
  return nameOf(teams, a.teamId).localeCompare(nameOf(teams, b.teamId));
}

/** The full table, best team first. */
export function computeStandings(league: League): Standing[] {
  const rows = tally(league.teams, league.fixtures, league.results).map((row) =>
    toStanding(row, league.settings),
  );
  return [...rows].sort((a, b) =>
    compareStandings(a, b, rows, league.fixtures, league.results, league.teams),
  );
}
