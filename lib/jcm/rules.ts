export type AgeGroup = 'O6' | 'O7' | 'O8';

export type RuleSet = {
  ageGroup: AgeGroup;
  legalBallsPerOver: number;
  pairMaxBalls: number;
  batterMaxBalls: number | null;
  inningsMaxBalls: number | null;
  retirementRuns: number | null;
  retirementBalls: number | null;
  coachThrow: boolean;
};

export const JCM_RULESETS: Record<AgeGroup, RuleSet> = {
  O6: {
    ageGroup: 'O6', legalBallsPerOver: 8, pairMaxBalls: 16, batterMaxBalls: 8,
    inningsMaxBalls: null, retirementRuns: null, retirementBalls: null, coachThrow: true,
  },
  O7: {
    ageGroup: 'O7', legalBallsPerOver: 6, pairMaxBalls: 24, batterMaxBalls: 12,
    inningsMaxBalls: null, retirementRuns: null, retirementBalls: null, coachThrow: true,
  },
  O8: {
    ageGroup: 'O8', legalBallsPerOver: 5, pairMaxBalls: 0, batterMaxBalls: null,
    inningsMaxBalls: 80, retirementRuns: 15, retirementBalls: 15, coachThrow: false,
  },
};

export function getRuleSet(ageGroup: AgeGroup): RuleSet {
  return JCM_RULESETS[ageGroup];
}
