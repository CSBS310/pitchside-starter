import type { League } from '../domain/types.js';

/** Where the league lives. One implementation per storage kind. */
export interface LeagueRepository {
  load(): League;
  save(league: League): void;
}

/** Injected so that "has this fixture been played yet?" is testable. */
export type Clock = () => Date;
