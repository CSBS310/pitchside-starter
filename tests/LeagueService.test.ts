import { describe, expect, it } from 'vitest';
import { DomainError } from '../src/domain/errors.js';
import { nightOf } from '../src/schedule/slotting.js';
import { fixture, league, result, scheduledService, serviceAt, SIX } from './support.js';

const NAMES = SIX.map((t) => t.name);

function code(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'not a DomainError';
  }
}

describe('LeagueService teams', () => {
  it('adds teams with sequential ids and trims names', () => {
    const service = serviceAt('2026-11-01T09:00');
    expect(service.addTeam(' Otters ', 'Maya')).toEqual({ id: 'T1', name: 'Otters', captain: 'Maya' });
    expect(service.addTeam('Herons', 'Devin').id).toBe('T2');
    expect(service.teams().map((t) => t.name)).toEqual(['Otters', 'Herons']);
  });

  it('refuses a duplicate team name regardless of case', () => {
    const service = serviceAt('2026-11-01T09:00');
    service.addTeam('Otters', 'Maya');
    expect(code(() => service.addTeam('otters', 'Someone'))).toBe('TEAM_EXISTS');
  });

  it('finds a team by id or by name', () => {
    const service = serviceAt('2026-11-01T09:00');
    service.addTeam('Sea Lions', 'Hana');
    expect(service.team('t1').name).toBe('Sea Lions');
    expect(service.team('sea lions').id).toBe('T1');
    expect(code(() => service.team('Walruses'))).toBe('TEAM_NOT_FOUND');
  });

  it('locks the team list once the schedule exists (R9)', () => {
    const service = scheduledService(NAMES);
    expect(code(() => service.addTeam('Volcanoes', 'Caleb'))).toBe('SCHEDULE_LOCKED');
  });
});

describe('LeagueService schedule', () => {
  it('needs at least two teams', () => {
    const service = serviceAt('2026-11-01T09:00');
    service.addTeam('Otters', 'Maya');
    expect(code(() => service.generateSchedule())).toBe('NOT_ENOUGH_TEAMS');
  });

  it('generates once and refuses a second time', () => {
    const service = scheduledService(NAMES);
    expect(service.fixtures()).toHaveLength(15);
    expect(code(() => service.generateSchedule())).toBe('SCHEDULE_EXISTS');
  });

  it('filters fixtures by round and by night', () => {
    const service = scheduledService(NAMES);
    const round2 = service.fixtures({ round: 2 });
    expect(round2).toHaveLength(3);
    expect(round2.every((f) => f.round === 2)).toBe(true);
    const night = nightOf(round2[0].slot);
    expect(service.fixtures({ night }).length).toBeGreaterThanOrEqual(3);
    expect(service.fixtures({ night: '2027-01-01' })).toEqual([]);
  });

});

describe('LeagueService results', () => {
  const played = league({
    teams: SIX,
    fixtures: [fixture('F1', 'T1', 'T2', '2026-11-18T18:00'), fixture('F2', 'T3', 'T4', '2026-11-18T19:00')],
  });

  it('records a result and marks the fixture played', () => {
    const service = serviceAt('2026-11-18T21:00', played);
    expect(service.recordResult('F1', 2, 1)).toEqual({ fixtureId: 'F1', homeGoals: 2, awayGoals: 1 });
    expect(service.fixture('F1').status).toBe('played');
    expect(service.standings()[0]).toMatchObject({ teamId: 'T1', points: 3 });
  });

  it('replaces a previous result instead of adding a second one (R7)', () => {
    const service = serviceAt('2026-11-18T21:00', played);
    service.recordResult('F1', 2, 1);
    service.recordResult('F1', 1, 1);
    expect(service.league().results).toEqual([result('F1', 1, 1)]);
    expect(service.standings().find((s) => s.teamId === 'T1')).toMatchObject({ points: 1, drawn: 1 });
  });

  it('rejects negative or fractional goals', () => {
    const service = serviceAt('2026-11-18T21:00', played);
    expect(code(() => service.recordResult('F1', -1, 0))).toBe('INVALID_SCORE');
    expect(code(() => service.recordResult('F1', 1.5, 0))).toBe('INVALID_SCORE');
  });

  it('refuses a result before kick-off (R8)', () => {
    const service = serviceAt('2026-11-18T17:59', played);
    expect(code(() => service.recordResult('F1', 1, 0))).toBe('FIXTURE_NOT_PLAYED');
    expect(code(() => service.recordForfeit('F1', 'home'))).toBe('FIXTURE_NOT_PLAYED');
  });

  it('records a forfeit as 0-3 with the forfeiting team noted (R5)', () => {
    const service = serviceAt('2026-11-18T21:00', played);
    const r = service.recordForfeit('F1', 'home');
    expect(r).toMatchObject({ homeGoals: 0, awayGoals: 3, forfeitBy: 'T1' });
    expect(service.fixture('F1').status).toBe('forfeit');
  });
});

describe('LeagueService nextNight', () => {
  it('returns the first night on or after today with fixtures, in slot order', () => {
    const service = scheduledService(NAMES, '2026-11-20T10:00');
    const card = service.nextNight();
    expect(card?.night).toBe('2026-11-25');
    const slots = card?.fixtures.map((f) => f.slot) ?? [];
    expect([...slots].sort()).toEqual(slots);
  });

  it('returns undefined after the last night', () => {
    const service = scheduledService(NAMES, '2027-01-01T10:00');
    expect(service.nextNight()).toBeUndefined();
  });
});
