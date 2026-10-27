import { DEFAULT_SETTINGS } from '../src/domain/league.js';
import type { Fixture, League, LeagueSettings, Result, Team } from '../src/domain/types.js';
import { LeagueService } from '../src/league/LeagueService.js';
import { InMemoryLeagueRepository } from '../src/storage/InMemoryLeagueRepository.js';

// Shared builders so each test states only what matters to it.

export const SETTINGS: LeagueSettings = {
  ...DEFAULT_SETTINGS,
  matchNights: ['2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16'],
};

export function team(id: string, name: string): Team {
  return { id, name, captain: `Captain of ${name}` };
}

export const SIX = ['Otters', 'Herons', 'Marmots', 'Sockeye', 'Lumberjacks', 'Sea Lions'].map(
  (name, i) => team(`T${i + 1}`, name),
);

export function fixture(id: string, homeId: string, awayId: string, slot = '2026-11-18T18:00'): Fixture {
  return { id, round: 1, homeId, awayId, court: 'A', slot, status: 'scheduled' };
}

export function result(fixtureId: string, homeGoals: number, awayGoals: number): Result {
  return { fixtureId, homeGoals, awayGoals };
}

export function league(parts: Partial<League> = {}): League {
  return {
    name: 'Test League',
    settings: SETTINGS,
    teams: [],
    rounds: [],
    fixtures: [],
    results: [],
    ...parts,
  };
}

/** A service over an in-memory league with a clock stuck at `now`. */
export function serviceAt(now: string, initial: League = league()): LeagueService {
  const repo = new InMemoryLeagueRepository(initial);
  return new LeagueService(repo, () => new Date(now));
}

/** A service with `names` already added as teams and the schedule drawn. */
export function scheduledService(names: readonly string[], now = '2026-12-31T23:00'): LeagueService {
  const service = serviceAt(now);
  names.forEach((name, i) => service.addTeam(name, `Captain ${i + 1}`));
  service.generateSchedule();
  return service;
}
