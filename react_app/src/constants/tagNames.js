// Team prefixes
export const HOME = 'home';
export const AWAY = 'away';

// Base tag types
export const TOUCH_ATTACKING = '_touch_attacking';
export const TOUCH_CLEARING = '_touch_clearing';
export const SCORE = '_score';
export const SCORING_POSSESSION = '_scoring_possession';

// Full tag names for home team
export const HOME_TOUCH_ATTACKING = `${HOME}${TOUCH_ATTACKING}`;
export const HOME_TOUCH_CLEARING = `${HOME}${TOUCH_CLEARING}`;
export const HOME_SCORE = `${HOME}${SCORE}`;
export const HOME_SCORING_POSSESSION = `${HOME}${SCORING_POSSESSION}`;

// Full tag names for away team
export const AWAY_TOUCH_ATTACKING = `${AWAY}${TOUCH_ATTACKING}`;
export const AWAY_TOUCH_CLEARING = `${AWAY}${TOUCH_CLEARING}`;
export const AWAY_SCORE = `${AWAY}${SCORE}`;
export const AWAY_SCORING_POSSESSION = `${AWAY}${SCORING_POSSESSION}`;

// Helper functions
export const getTeamTouchAttacking = (team) => `${team}${TOUCH_ATTACKING}`;
export const getTeamTouchClearing = (team) => `${team}${TOUCH_CLEARING}`;
export const getTeamScore = (team) => `${team}${SCORE}`;
export const getTeamScoringPossession = (team) => `${team}${SCORING_POSSESSION}`;

// Get opposite team
export const getOppositeTeam = (team) => team === HOME ? AWAY : HOME;

export default {
  HOME,
  AWAY,
  TOUCH_ATTACKING,
  TOUCH_CLEARING,
  SCORE,
  SCORING_POSSESSION,
  HOME_TOUCH_ATTACKING,
  HOME_TOUCH_CLEARING,
  HOME_SCORE,
  HOME_SCORING_POSSESSION,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING,
  AWAY_SCORE,
  AWAY_SCORING_POSSESSION,
  getTeamTouchAttacking,
  getTeamTouchClearing,
  getTeamScore,
  getTeamScoringPossession,
  getOppositeTeam
}; 