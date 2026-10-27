import { emptyLeague } from '../domain/league.js';
import type { League } from '../domain/types.js';
import type { LeagueRepository } from '../league/ports.js';

/** Keeps the league in a variable. Used by tests and by anything throwaway. */
export class InMemoryLeagueRepository implements LeagueRepository {
  constructor(private league: League = emptyLeague()) {}

  load(): League {
    return this.league;
  }

  save(league: League): void {
    this.league = league;
  }
}
