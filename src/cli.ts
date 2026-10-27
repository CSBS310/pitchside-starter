import { resolve } from 'node:path';
import { parseLocal } from './domain/dates.js';
import { DomainError } from './domain/errors.js';
import type { Fixture, League, Standing } from './domain/types.js';
import { LeagueService } from './league/LeagueService.js';
import type { Clock } from './league/ports.js';
import { JsonFileLeagueRepository } from './storage/JsonFileLeagueRepository.js';

// Command-line front end. Parses process.argv by hand: positional words are
// the command and its arguments, `--flag value` pairs are options.

const USAGE = `usage: pitchside <command> [options]

  teams                                  list the teams
  add-team <name> <captain>              add a team (before the schedule exists)
  schedule                               generate the schedule and print it
  fixtures [--round n] [--night DATE]    list fixtures
  record <fixtureId> <home>-<away>       record or correct a result, e.g. record F3 2-1
  record <fixtureId> --forfeit home|away record a forfeit
  standings                              print the table
  next                                   print the next match night's card

options
  --file <path>   league file (default data/sample.json)
  --now <iso>     pretend it is this local time, e.g. --now 2026-11-19T21:00`;

interface Args {
  readonly command: string;
  readonly positional: string[];
  readonly options: Map<string, string>;
}

function parseArgs(argv: readonly string[]): Args {
  const positional: string[] = [];
  const options = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      options.set(argv[i].slice(2), argv[i + 1] ?? '');
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  const [command = 'help', ...rest] = positional;
  return { command, positional: rest, options };
}

function makeClock(now: string | undefined): Clock {
  const fixed = now === undefined ? undefined : parseLocal(now);
  return () => fixed ?? new Date();
}

const pad = (text: string, width: number): string => text.padEnd(width);
const num = (n: number, width: number): string => String(n).padStart(width);

function teamName(league: League, id: string): string {
  return league.teams.find((t) => t.id === id)?.name ?? id;
}

/** '2026-11-18T19:00' -> '2026-11-18 19:00' for display. */
function showSlot(slot: string): string {
  const [day, time] = slot.split('T');
  return `${day} ${time}`;
}

function fixtureLine(league: League, f: Fixture): string {
  const result = league.results.find((r) => r.fixtureId === f.id);
  const score =
    result === undefined
      ? f.status
      : `${result.homeGoals}-${result.awayGoals}${result.forfeitBy ? ' (forfeit)' : ''}`;
  const teams = `${pad(teamName(league, f.homeId), 12)} v ${pad(teamName(league, f.awayId), 12)}`;
  return `${pad(f.id, 4)} R${pad(String(f.round), 2)} ${showSlot(f.slot)}  court ${f.court}  ${teams} ${score}`;
}

function printFixtures(league: League, fixtures: readonly Fixture[]): void {
  if (fixtures.length === 0) {
    console.log('(no fixtures)');
  }
  for (const f of fixtures) {
    console.log(fixtureLine(league, f));
  }
}

function printStandings(league: League, table: readonly Standing[]): void {
  console.log(`${pad('#', 3)}${pad('team', 13)}  P  W  D  L  GF  GA  GD  Pts`);
  table.forEach((s, i) => {
    const record = [s.played, s.won, s.drawn, s.lost].map((n) => num(n, 2)).join(' ');
    const goals = [s.goalsFor, s.goalsAgainst, s.goalDifference].map((n) => num(n, 3)).join(' ');
    console.log(`${pad(String(i + 1), 3)}${pad(teamName(league, s.teamId), 13)} ${record} ${goals}  ${num(s.points, 3)}`);
  });
}

function cmdTeams(service: LeagueService): void {
  console.log(`${pad('id', 4)} ${pad('team', 12)} captain`);
  for (const t of service.teams()) {
    console.log(`${pad(t.id, 4)} ${pad(t.name, 12)} ${t.captain}`);
  }
}

function cmdAddTeam(service: LeagueService, args: Args): void {
  const [name, captain] = args.positional;
  if (name === undefined || captain === undefined) {
    throw new DomainError('TEAM_NOT_FOUND', 'add-team needs a name and a captain');
  }
  const team = service.addTeam(name, captain);
  console.log(`Added ${team.name} (${team.id}), captain ${team.captain}`);
}

function cmdSchedule(service: LeagueService): void {
  const league = service.generateSchedule();
  for (const round of league.rounds) {
    const bye = round.byeTeamId === undefined ? '' : `  Bye: ${teamName(league, round.byeTeamId)}`;
    console.log(`Round ${round.number}${bye}`);
    printFixtures(league, league.fixtures.filter((f) => f.round === round.number));
  }
}

function cmdFixtures(service: LeagueService, args: Args): void {
  const round = args.options.get('round');
  const filter = { round: round === undefined ? undefined : Number(round), night: args.options.get('night') };
  const league = service.league();
  printFixtures(league, service.fixtures(filter));
  const chosen = league.rounds.find((r) => r.number === filter.round);
  if (chosen?.byeTeamId !== undefined) {
    console.log(`Round ${chosen.number} bye: ${teamName(league, chosen.byeTeamId)}`);
  }
}

function cmdRecord(service: LeagueService, args: Args): void {
  const [fixtureId, score] = args.positional;
  const forfeit = args.options.get('forfeit');
  if (fixtureId === undefined) {
    throw new DomainError('FIXTURE_NOT_FOUND', 'record needs a fixture id');
  }
  if (forfeit === 'home' || forfeit === 'away') {
    service.recordForfeit(fixtureId, forfeit);
  } else {
    const match = /^(\d+)-(\d+)$/.exec(score ?? '');
    if (match === null) {
      throw new DomainError('INVALID_SCORE', 'record needs a score like 2-1, or --forfeit home|away');
    }
    service.recordResult(fixtureId, Number(match[1]), Number(match[2]));
  }
  console.log(fixtureLine(service.league(), service.fixture(fixtureId)));
}

function cmdNext(service: LeagueService): void {
  const card = service.nextNight();
  if (card === undefined) {
    console.log('No match nights left');
    return;
  }
  console.log(`Next match night: ${card.night}`);
  printFixtures(service.league(), card.fixtures);
}

function run(argv: readonly string[]): void {
  const args = parseArgs(argv);
  const file = resolve(args.options.get('file') ?? 'data/sample.json');
  const service = new LeagueService(new JsonFileLeagueRepository(file), makeClock(args.options.get('now')));
  switch (args.command) {
    case 'teams':
      return cmdTeams(service);
    case 'add-team':
      return cmdAddTeam(service, args);
    case 'schedule':
      return cmdSchedule(service);
    case 'fixtures':
      return cmdFixtures(service, args);
    case 'record':
      return cmdRecord(service, args);
    case 'standings':
      return printStandings(service.league(), service.standings());
    case 'next':
      return cmdNext(service);
    default:
      console.log(USAGE);
  }
}

try {
  run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof DomainError)) {
    throw error;
  }
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
