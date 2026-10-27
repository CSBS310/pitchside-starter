// Entity types. Everything is a plain, readonly object so that state can be
// copied into and out of the JSON file without any class instances.

export type Court = 'A' | 'B';
export type FixtureStatus = 'scheduled' | 'played' | 'forfeit';

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly captain: string;
}

/** One match, pinned to a court and a local time slot ('2026-11-18T19:00'). */
export interface Fixture {
  readonly id: string;
  readonly round: number;
  readonly homeId: string;
  readonly awayId: string;
  readonly court: Court;
  readonly slot: string;
  readonly status: FixtureStatus;
}

/** The outcome of a fixture. A forfeit still carries goals (see R5). */
export interface Result {
  readonly fixtureId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly forfeitBy?: string;
}

/** Pairings live in fixtures; the round's bye (odd team counts) lives here. */
export interface Round {
  readonly number: number;
  readonly byeTeamId?: string;
}

export interface Pairing {
  readonly homeId: string;
  readonly awayId: string;
}

/** Output of the schedule generator, before fixtures get courts and slots. */
export interface RoundPlan extends Round {
  readonly pairings: readonly Pairing[];
}

/** One row of the league table. Derived from results, never stored. */
export interface Standing {
  readonly teamId: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface LeagueSettings {
  readonly pointsForWin: number;
  readonly pointsForDraw: number;
  readonly courts: readonly Court[];
  /** Kick-off times on a match night, in order, e.g. ['18:00', '19:00']. */
  readonly slotsPerNight: readonly string[];
  /** Dates of the match nights, in order, e.g. ['2026-11-18', ...]. */
  readonly matchNights: readonly string[];
  /** How long a slot is occupied; decides when a fixture is over (R8). */
  readonly matchMinutes: number;
}

/** The whole league: this is exactly what the JSON file holds. */
export interface League {
  readonly name: string;
  readonly settings: LeagueSettings;
  readonly teams: readonly Team[];
  readonly rounds: readonly Round[];
  readonly fixtures: readonly Fixture[];
  readonly results: readonly Result[];
}
