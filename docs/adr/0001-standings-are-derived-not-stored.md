# ADR 0001: Standings are derived from results, never stored

**Status:** Accepted
**Date:** 2026-10-19

## Context

The spreadsheet this tool replaces kept the league table as cells that the coordinator
updated by hand after each match night, and it drifted from the results more than once.
Results get corrected (a score typed the wrong way round, a forfeit entered against the
wrong team), and every correction has to be reflected in the table. The league is small:
at most ten teams and forty-five fixtures.

## Decision

We will store only teams, fixtures and results. `standings()` recomputes the whole table
from the results on every call, in `league/standings.ts`, which is a pure function of the
`League` value. There is no `standings` array in the JSON file and no cache.

## Alternatives considered

- **Store the table and update it on each result** -- fast, but every code path that
  touches a result has to update the table correctly, and a correction has to undo the
  previous effect first. This is exactly how the spreadsheet went wrong.
- **Store the table and mark it stale** -- adds a flag and a second code path for the
  stale case, for a computation that takes well under a millisecond at this size.

## Consequences

Correcting a result is a one-line replace (R7) and the table is right by construction.
The comparator has access to the full results list, which makes head-to-head lookups
easy but also tempting to do inefficiently. If the league ever grows to hundreds of
fixtures the recompute-on-read choice should be revisited, with a test that pins the
derived numbers before any caching is added.
