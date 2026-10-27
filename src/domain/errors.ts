// A single error type for anything the domain refuses to do. The CLI prints the
// message and exits non-zero; tests match on `code` so wording can change freely.

export type ErrorCode =
  | 'TEAM_EXISTS' | 'TEAM_NOT_FOUND' | 'NOT_ENOUGH_TEAMS'
  | 'SCHEDULE_EXISTS' | 'SCHEDULE_LOCKED' | 'NOT_ENOUGH_NIGHTS' | 'ROUND_TOO_LARGE'
  | 'FIXTURE_NOT_FOUND' | 'FIXTURE_NOT_PLAYED' | 'INVALID_SCORE'
  | 'INVALID_DATE' | 'BAD_FILE';

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
