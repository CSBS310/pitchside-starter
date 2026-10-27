import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addMinutes, formatLocal, parseLocal } from '../src/domain/dates.js';
import { DomainError } from '../src/domain/errors.js';
import { emptyLeague } from '../src/domain/league.js';
import { InMemoryLeagueRepository } from '../src/storage/InMemoryLeagueRepository.js';
import { JsonFileLeagueRepository, parseLeague } from '../src/storage/JsonFileLeagueRepository.js';
import { league, SIX } from './support.js';

describe('InMemoryLeagueRepository', () => {
  it('starts empty and returns what was saved', () => {
    const repo = new InMemoryLeagueRepository();
    expect(repo.load().teams).toEqual([]);
    const next = league({ teams: SIX });
    repo.save(next);
    expect(repo.load()).toBe(next);
  });
});

describe('JsonFileLeagueRepository', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pitchside-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty league when the file does not exist yet', () => {
    const repo = new JsonFileLeagueRepository(join(dir, 'missing.json'));
    expect(repo.load()).toEqual(emptyLeague());
  });

  it('round-trips a league through the file, creating folders as needed', () => {
    const path = join(dir, 'nested', 'league.json');
    const repo = new JsonFileLeagueRepository(path);
    repo.save(league({ teams: SIX }));
    expect(new JsonFileLeagueRepository(path).load().teams).toEqual(SIX);
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true);
  });

  it('rejects a file that is not JSON or not a league', () => {
    const path = join(dir, 'bad.json');
    writeFileSync(path, '{ not json');
    expect(() => new JsonFileLeagueRepository(path).load()).toThrowError(DomainError);
    expect(() => parseLeague('{"teams": []}', 'x.json')).toThrowError(/does not look like a league/);
  });

  it('loads the shipped sample data', () => {
    const repo = new JsonFileLeagueRepository('data/sample.json');
    const sample = repo.load();
    expect(sample.teams).toHaveLength(7);
    expect(sample.fixtures).toHaveLength(21);
  });
});

describe('dates', () => {
  it('parses local dates and date-times', () => {
    expect(formatLocal(parseLocal('2026-11-18'))).toBe('2026-11-18T00:00');
    expect(formatLocal(parseLocal('2026-11-18T19:05'))).toBe('2026-11-18T19:05');
  });

  it('rejects anything that is not an ISO date', () => {
    expect(() => parseLocal('18/11/2026')).toThrowError(DomainError);
    expect(() => parseLocal('2026-13-45')).toThrowError(/Not a date/);
  });

  it('adds minutes across an hour boundary', () => {
    expect(addMinutes('2026-11-18T19:30', 50)).toBe('2026-11-18T20:20');
  });
});
