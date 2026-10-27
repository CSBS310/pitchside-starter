import { addMinutes, formatLocal, parseLocal } from '../domain/dates.js';
import { DomainError } from '../domain/errors.js';
import type { Fixture, League, Result, Standing, Team } from '../domain/types.js';
import { roundRobin } from '../schedule/roundRobin.js';
import { nightOf, slotRounds } from '../schedule/slotting.js';
import type { Clock, LeagueRepository } from './ports.js';
import { computeStandings } from './standings.js';

export interface FixtureFilter {
  readonly round?: number;
  readonly night?: string;
}

export interface NightCard {
  readonly night: string;
  readonly fixtures: Fixture[];
}

export type ForfeitSide = 'home' | 'away';

/** Goals awarded to the non-forfeiting side (R5). */
const FORFEIT_GOALS = 3;

/** The one place that changes league state: load, work on plain objects, save. */
export class LeagueService {
  constructor(
    private readonly repo: LeagueRepository,
    private readonly clock: Clock,
  ) {}

  league(): League {
    return this.repo.load();
  }

  teams(): readonly Team[] {
    return this.repo.load().teams;
  }

  /** Find a team by id or by name, case-insensitively. */
  team(idOrName: string): Team {
    const wanted = idOrName.trim().toLowerCase();
    const team = this.teams().find((t) => t.id.toLowerCase() === wanted || t.name.toLowerCase() === wanted);
    if (team === undefined) {
      throw new DomainError('TEAM_NOT_FOUND', `No team called '${idOrName}'`);
    }
    return team;
  }

  addTeam(name: string, captain: string): Team {
    const league = this.repo.load();
    if (league.fixtures.length > 0) {
      // R9: the round-robin is built from the team list, so it is final once drawn.
      throw new DomainError('SCHEDULE_LOCKED', 'Teams cannot be added after the schedule is generated');
    }
    const clash = league.teams.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    if (clash !== undefined) {
      throw new DomainError('TEAM_EXISTS', `A team called '${clash.name}' already exists`);
    }
    const team: Team = { id: `T${league.teams.length + 1}`, name: name.trim(), captain: captain.trim() };
    this.repo.save({ ...league, teams: [...league.teams, team] });
    return team;
  }

  generateSchedule(): League {
    const league = this.repo.load();
    if (league.fixtures.length > 0) {
      throw new DomainError('SCHEDULE_EXISTS', 'The schedule has already been generated');
    }
    if (league.teams.length < 2) {
      throw new DomainError('NOT_ENOUGH_TEAMS', 'At least two teams are needed to make a schedule');
    }
    const plans = roundRobin(league.teams.map((t) => t.id));
    const { rounds, fixtures } = slotRounds(plans, league.settings);
    const next = { ...league, rounds, fixtures };
    this.repo.save(next);
    return next;
  }

  fixtures(filter: FixtureFilter = {}): Fixture[] {
    const league = this.repo.load();
    if (filter.night !== undefined) {
      parseLocal(filter.night);
    }
    const inRound = (f: Fixture): boolean => filter.round === undefined || f.round === filter.round;
    const onNight = (f: Fixture): boolean => filter.night === undefined || nightOf(f.slot) === filter.night;
    return league.fixtures.filter((f) => inRound(f) && onNight(f));
  }

  fixture(fixtureId: string): Fixture {
    const fixture = this.repo.load().fixtures.find((f) => f.id.toLowerCase() === fixtureId.toLowerCase());
    if (fixture === undefined) {
      throw new DomainError('FIXTURE_NOT_FOUND', `No fixture '${fixtureId}'`);
    }
    return fixture;
  }

  /** Record (or correct, R7) a played result. */
  recordResult(fixtureId: string, homeGoals: number, awayGoals: number): Result {
    if (!isScore(homeGoals) || !isScore(awayGoals)) {
      throw new DomainError('INVALID_SCORE', 'Goals must be whole numbers of zero or more');
    }
    const fixture = this.fixture(fixtureId);
    this.assertPlayed(fixture);
    return this.store({ fixtureId: fixture.id, homeGoals, awayGoals }, 'played');
  }

  /** Record a forfeit: 0-3 against the side that did not show (R5). */
  recordForfeit(fixtureId: string, side: ForfeitSide): Result {
    const fixture = this.fixture(fixtureId);
    this.assertPlayed(fixture);
    const forfeitBy = side === 'home' ? fixture.homeId : fixture.awayId;
    return this.store({ fixtureId: fixture.id, homeGoals: 0, awayGoals: FORFEIT_GOALS, forfeitBy }, 'forfeit');
  }

  standings(): Standing[] {
    return computeStandings(this.repo.load());
  }

  /** The next match night on or after now, with its fixtures in slot order. */
  nextNight(): NightCard | undefined {
    const league = this.repo.load();
    const today = formatLocal(this.clock()).slice(0, 10);
    const hasFixtures = (n: string): boolean => league.fixtures.some((f) => nightOf(f.slot) === n);
    const night = league.settings.matchNights.find((n) => n >= today && hasFixtures(n));
    if (night === undefined) {
      return undefined;
    }
    const fixtures = league.fixtures
      .filter((f) => nightOf(f.slot) === night)
      .sort((a, b) => a.slot.localeCompare(b.slot) || a.court.localeCompare(b.court));
    return { night, fixtures };
  }

  /** R8: a result needs the match to be over, by the injected clock. */
  private assertPlayed(fixture: Fixture): void {
    const now = this.clock();
    const start = parseLocal(fixture.slot);
    if (now <= start) {
      const end = addMinutes(fixture.slot, this.repo.load().settings.matchMinutes).replace('T', ' ');
      throw new DomainError('FIXTURE_NOT_PLAYED', `${fixture.id} is not over until ${end} and cannot be recorded yet`);
    }
  }

  /** Replace any previous result for the fixture and mark its status. */
  private store(result: Result, status: Fixture['status']): Result {
    const league = this.repo.load();
    const results = [...league.results.filter((r) => r.fixtureId !== result.fixtureId), result];
    const fixtures = league.fixtures.map((f) => (f.id === result.fixtureId ? { ...f, status } : f));
    this.repo.save({ ...league, results, fixtures });
    return result;
  }
}

function isScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}
