import type { League, LeagueSettings } from './types.js';

// The settings a brand-new file starts with. Campus Recreation has used the same
// two courts and the same three kick-off times for years, so these rarely change.
export const DEFAULT_SETTINGS: LeagueSettings = {
  pointsForWin: 3,
  pointsForDraw: 1,
  courts: ['A', 'B'],
  slotsPerNight: ['18:00', '19:00', '20:00'],
  matchNights: ['2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09'],
  matchMinutes: 50,
};

export function emptyLeague(settings: LeagueSettings = DEFAULT_SETTINGS): League {
  return { name: 'Intramural Futsal', settings, teams: [], rounds: [], fixtures: [], results: [] };
}
