import type { Pairing, RoundPlan } from '../domain/types.js';

// Single round-robin by the circle method (R1, R2). Seat the teams in a ring,
// pin seat 0 and rotate everyone else one seat per round; pairing seat i with
// seat n-1-i gives every team every opponent exactly once.
//
// With an odd number of teams a phantom takes the last seat. Whoever is paired
// with the phantom in a round has the bye (R2).

const BYE = '__bye__';

/** Generate the rounds for a set of team ids. Order of ids is the seating order. */
export function roundRobin(teamIds: readonly string[]): RoundPlan[] {
  const ids = [...teamIds];
  const odd = ids.length % 2 === 1;
  if (odd) {
    ids.push(BYE);
  }
  const rounds: RoundPlan[] = [];
  let ring: readonly string[] = ids;
  for (let number = 1; number < ids.length; number++) {
    const pairings = pairSeats(ring, number);
    // Seat 0 is pinned and sits opposite the phantom, so it takes the bye.
    const byeTeamId = odd ? ids[0] : undefined;
    rounds.push({ number, byeTeamId, pairings });
    ring = rotate(ring);
  }
  return rounds;
}

/** Pair seat i with seat n-1-i, skipping the phantom. */
function pairSeats(ring: readonly string[], round: number): Pairing[] {
  const n = ring.length;
  const pairings: Pairing[] = [];
  for (let i = 0; i < n / 2; i++) {
    const a = ring[i];
    const b = ring[n - 1 - i];
    if (a === BYE || b === BYE) {
      continue;
    }
    pairings.push(orient(a, b, round, i));
  }
  return pairings;
}

/**
 * Home/away (R4). A rotating team moves one seat per round, so flipping on the
 * seat's parity alternates its venue; the pinned seat never moves, so it flips
 * on the round instead. Best effort: the circle method does not guarantee a
 * balanced split, especially near the wrap-around seat.
 */
function orient(a: string, b: string, round: number, seat: number): Pairing {
  const swap = seat === 0 ? round % 2 === 0 : seat % 2 === 0;
  return swap ? { homeId: b, awayId: a } : { homeId: a, awayId: b };
}

/** Keep seat 0, move the last seat to seat 1 and shift the rest along. */
function rotate(ring: readonly string[]): string[] {
  const [pinned, ...rest] = ring;
  const last = rest[rest.length - 1];
  return [pinned, last, ...rest.slice(0, -1)];
}
