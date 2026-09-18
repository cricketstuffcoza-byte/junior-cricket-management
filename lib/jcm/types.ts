import type { AgeGroup } from './rules';

export type MatchStatus = 'SCHEDULED' | 'READY' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'FINALISED';
export type EventType = 'RUN' | 'WIDE' | 'NO_BALL' | 'WICKET' | 'COACH_THROW' | 'STRIKER_SWITCH' | 'UNDO' | 'RETIREMENT';

export type ScoringEvent = {
  eventId: string;
  matchId: string;
  inningsId: string;
  sequenceNumber: number;
  timestamp: string;
  eventType: EventType;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  runs?: number;
  extras?: { wides?: number; noBalls?: number; coachRuns?: number; unplayable?: number };
  wicket?: { batterId: string; dismissalType: string; fielderId?: string };
  previousState: MatchState;
  resultingState: MatchState;
  createdBy: string;
};

export type MatchState = {
  matchId: string;
  ageGroup: AgeGroup;
  status: MatchStatus;
  innings: number;
  battingTeamId: string;
  bowlingTeamId: string;
  score: number;
  wickets: number;
  legalBalls: number;
  over: number;
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  battingPairId: string | null;
  pairBalls: number;
  batterBalls: Record<string, number>;
  batterStats: Record<string, { runs: number; balls: number; fours: number; sixes: number; dismissed: boolean }>;
  bowlingStats: Record<string, { balls: number; runs: number; wickets: number }>;
  fieldingStats: Record<string, { catches: number; runOuts: number }>;
  extras: { wides: number; noBalls: number; coachRuns: number; unplayable: number };
  pending: { wicket?: boolean; runOut?: boolean; fielderRequired?: boolean; newBatterRequired?: boolean; coachThrow?: boolean };
  retirementState: Record<string, { retired: boolean; reason?: string }>;
  target: number | null;
  result: { completed: boolean; reason?: 'TARGET_REACHED' | 'MAX_BALLS' | 'INNINGS_COMPLETE' };
};
