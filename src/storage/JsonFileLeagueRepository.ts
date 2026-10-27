import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DomainError } from '../domain/errors.js';
import { emptyLeague } from '../domain/league.js';
import type { League } from '../domain/types.js';
import type { LeagueRepository } from '../league/ports.js';

/** One JSON file whose shape is exactly `League`. Nothing is cached, so two
 *  commands in a row always see each other's writes. */
export class JsonFileLeagueRepository implements LeagueRepository {
  constructor(private readonly path: string) {}

  load(): League {
    if (!existsSync(this.path)) {
      return emptyLeague();
    }
    const text = readFileSync(this.path, 'utf8');
    return parseLeague(text, this.path);
  }

  save(league: League): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, `${JSON.stringify(league, null, 2)}\n`, 'utf8');
  }
}

/** Parse the file and check it has the collections we rely on. */
export function parseLeague(text: string, path: string): League {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DomainError('BAD_FILE', `${path} is not valid JSON`);
  }
  if (!isLeagueShaped(raw)) {
    throw new DomainError('BAD_FILE', `${path} does not look like a league file`);
  }
  return raw;
}

function isLeagueShaped(value: unknown): value is League {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const lists = ['teams', 'rounds', 'fixtures', 'results'].every((key) => Array.isArray(record[key]));
  return typeof record.name === 'string' && typeof record.settings === 'object' && lists;
}
