# Pitchside

Fixtures, results and standings for a small intramural league. Campus Recreation at
Kalama Ridge College runs a 6–10 team futsal league each quarter on two courts.
The coordinator used to build the fixture list by hand and recompute the table in a
spreadsheet after every match night. Pitchside generates a single round-robin schedule,
slots it onto the available match nights, records results and forfeits, and prints
standings using the league's tiebreakers. One league at a time, one division, many teams.

**This is a fictional system made for teaching.** Kalama Ridge College, its teams,
captains, courts and every result in `data/sample.json` are invented. Nothing here
refers to a real place, person or organisation.

## What you need

- Node 20 or newer (`node --version`). Nothing else: there are no runtime dependencies.

## Getting started

```
npm install
npm run check
```

`check` runs the type checker, the linter and the tests. If it is green you are ready.

## Everyday commands

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run typecheck` | Compile with `tsc`, report type errors, emit nothing           |
| `npm run lint`      | ESLint over `src/` and `tests/` (complexity limit is 10)       |
| `npm test`          | Run the Vitest suite once                                      |
| `npm run coverage`  | Tests plus a coverage report (80% lines, 70% branches minimum) |
| `npm run build`     | Compile to `dist/`                                             |
| `npm start -- ...`  | Run the CLI from `dist/` (same as `node dist/cli.js ...`)      |

The CLI reads and writes `data/sample.json` unless you pass `--file <path>`. Commands
that care what time it is (`record`, `next`) use the real clock unless you pass
`--now 2026-11-19T21:00`; use that for demos so that results can be entered for
fixtures that have "already happened".

## Demo walkthrough

Build first, then follow the league through its third match night. Every command
below runs against the shipped sample data; copy `data/sample.json` somewhere first if
you want to keep it pristine.

```
npm run build
```

1. Who is playing.

   ```
   $ node dist/cli.js teams
   id   team         captain
   T1   Otters       Maya Lindqvist
   T2   Herons       Devin Okafor
   T3   Marmots      Priya Raman
   ...
   ```

2. The table after two match nights. Herons and Volcanoes are level on points,
   goal difference and goals for.

   ```
   $ node dist/cli.js standings
   #  team           P  W  D  L  GF  GA  GD  Pts
   1  Herons         3  2  0  1   6   4   2    6
   2  Volcanoes      4  2  0  2   6   4   2    6
   3  Sea Lions      3  2  0  1   4   4   0    6
   ...
   ```

3. What happened on the first night, including the match between those two.

   ```
   $ node dist/cli.js fixtures --night 2026-11-18
   F1   R1  2026-11-18 18:00  court A  Herons       v Volcanoes    0-3
   F2   R1  2026-11-18 18:00  court B  Sea Lions    v Marmots      1-0
   ...
   ```

4. The card for the next match night, as seen the day before.

   ```
   $ node dist/cli.js next --now 2026-12-01T10:00
   Next match night: 2026-12-02
   F13  R5  2026-12-02 18:00  court A  Otters       v Sockeye      scheduled
   F14  R5  2026-12-02 18:00  court B  Lumberjacks  v Marmots      scheduled
   ...
   ```

5. Trying to enter a score before the match is refused.

   ```
   $ node dist/cli.js record F13 3-1 --now 2026-12-02T17:30
   error: F13 is not over until 2026-12-02 18:50 and cannot be recorded yet
   ```

6. After the night is over, enter a result and a forfeit.

   ```
   $ node dist/cli.js record F13 3-1 --now 2026-12-02T21:00
   F13  R5  2026-12-02 18:00  court A  Otters       v Sockeye      3-1
   $ node dist/cli.js record F14 --forfeit away --now 2026-12-02T21:00
   F14  R5  2026-12-02 18:00  court B  Lumberjacks  v Marmots      0-3 (forfeit)
   ```

7. Correct a mistake: a second `record` for the same fixture replaces the first.

   ```
   $ node dist/cli.js record F13 3-2 --now 2026-12-02T21:00
   F13  R5  2026-12-02 18:00  court A  Otters       v Sockeye      3-2
   ```

8. The table recomputes from the results; nothing is stored.

   ```
   $ node dist/cli.js standings
   #  team           P  W  D  L  GF  GA  GD  Pts
   1  Marmots        5  3  0  2   6   5   1    9
   2  Otters         4  2  1  1   9   8   1    7
   ...
   ```

To start a league of your own: `node dist/cli.js add-team "Walruses" "Sam Ortiz" --file data/local.json`
for each team, then `node dist/cli.js schedule --file data/local.json`. Teams cannot be
added once the schedule exists.

## How the code is organised

`src/schedule/` turns a team list into rounds and then fixtures (pure functions);
`src/league/` holds the service that changes state, the standings calculation and the
ports it needs; `src/storage/` has the in-memory and JSON-file repositories; `src/cli.ts`
is the only place that talks to the terminal. ARCHITECTURE.md has the diagrams, the
numbered domain rules and the known limitations.

## Where to start

Read ARCHITECTURE.md, then CONTRIBUTING.md for the branch and review workflow. Issues
`#1` and `#2` are small, well-bounded and labelled `good first issue`; pick one of those
first. Run `npm run check` before every push.
