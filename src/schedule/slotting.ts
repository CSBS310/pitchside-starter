import { DomainError } from '../domain/errors.js';
import type { Court, Fixture, LeagueSettings, Round, RoundPlan } from '../domain/types.js';

// Turn rounds of pairings into fixtures with a court and a kick-off (R3).
// Nights are filled in order; a round is never split across nights, so a
// round that does not fit in what is left of a night moves to the next one.

export interface Slotted {
  readonly rounds: Round[];
  readonly fixtures: Fixture[];
}

interface Seat {
  readonly court: Court;
  readonly slot: string;
}

/** All court × time seats on one night, earliest kick-off first. */
function seatsOnNight(night: string, settings: LeagueSettings): Seat[] {
  const seats: Seat[] = [];
  for (const time of settings.slotsPerNight) {
    for (const court of settings.courts) {
      // Slots are stored as local ISO date-time, e.g. '2026-11-18T19:00'.
      seats.push({ court, slot: `${night}T${time}` });
    }
  }
  return seats;
}

export function slotRounds(plans: readonly RoundPlan[], settings: LeagueSettings): Slotted {
  const capacity = settings.courts.length * settings.slotsPerNight.length;
  const fixtures: Fixture[] = [];
  const rounds: Round[] = [];
  let nightIndex = 0;
  let free: Seat[] = seatsOnNight(settings.matchNights[0] ?? '', settings);

  for (const plan of plans) {
    if (plan.pairings.length > capacity) {
      const message = `Round ${plan.number} has ${plan.pairings.length} matches but a night only holds ${capacity}`;
      throw new DomainError('ROUND_TOO_LARGE', message);
    }
    if (plan.pairings.length > free.length) {
      nightIndex += 1;
      free = seatsOnNight(settings.matchNights[nightIndex] ?? '', settings);
    }
    if (nightIndex >= settings.matchNights.length) {
      const message = `${plans.length} rounds do not fit in ${settings.matchNights.length} match nights`;
      throw new DomainError('NOT_ENOUGH_NIGHTS', message);
    }
    for (const pairing of plan.pairings) {
      const seat = free.shift() as Seat;
      fixtures.push({
        id: `F${fixtures.length + 1}`,
        round: plan.number,
        homeId: pairing.homeId,
        awayId: pairing.awayId,
        court: seat.court,
        slot: seat.slot,
        status: 'scheduled',
      });
    }
    rounds.push({ number: plan.number, byeTeamId: plan.byeTeamId });
  }
  return { rounds, fixtures };
}

/** The date part of a slot, e.g. '2026-11-18'. */
export function nightOf(slot: string): string {
  return slot.split('T')[0];
}
