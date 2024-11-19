import { describe, it, expect } from 'vitest';
import { calculateTeamPossessions } from '../../../src/components/stats/statUtils';
import {
  HOME_TOUCH_ATTACKING,
  HOME_TOUCH_CLEARING,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING,
  GAME_START,
  GAME_END,
  SCORE
} from '../../../src/constants/tagNames';

describe('calculateTeamPossessions', () => {
  // Basic input handling
  it('should return 0 for null video', () => {
    expect(calculateTeamPossessions(null, 'home')).toBe(0);
  });

  it('should return 0 for video without tags', () => {
    expect(calculateTeamPossessions({}, 'home')).toBe(0);
  });

  // Simple cases
  it('should count single clearing touch as one possession', () => {
    const video = {
      tags: [
        { name: HOME_TOUCH_CLEARING, frame: 10 },
        { name: HOME_TOUCH_CLEARING, frame: 15 },
        { name: AWAY_TOUCH_CLEARING, frame: 20 }
      ]
    };
    
    expect(calculateTeamPossessions(video, 'home')).toBe(1);
  });

  it('should count multiple separate clearing touches as separate possessions', () => {
    const video = {
      tags: [
        { name: HOME_TOUCH_CLEARING, frame: 10 },
        { name: HOME_TOUCH_CLEARING, frame: 13 },
        { name: AWAY_TOUCH_CLEARING, frame: 15 },
        { name: HOME_TOUCH_CLEARING, frame: 20 },
        { name: HOME_TOUCH_CLEARING, frame: 25 },
        { name: AWAY_TOUCH_CLEARING, frame: 30 }
      ]
    };
    
    expect(calculateTeamPossessions(video, 'home')).toBe(2);
  });

  // Complex scenarios
  it('should not count consecutive clearing touches as separate possessions', () => {
    const video = {
      tags: [
        { name: HOME_TOUCH_CLEARING, frame: 10 },
        { name: HOME_TOUCH_CLEARING, frame: 15 }, // Same possession
        { name: AWAY_TOUCH_CLEARING, frame: 20 },
        { name: HOME_TOUCH_CLEARING, frame: 25 }
      ]
    };
    
    expect(calculateTeamPossessions(video, 'home')).toBe(1);
  });

  it('should handle mixed touch types correctly', () => {
    const video = {
      tags: [
        { name: HOME_TOUCH_CLEARING, frame: 10 },
        { name: HOME_TOUCH_ATTACKING, frame: 15 },
        { name: AWAY_TOUCH_CLEARING, frame: 20 },
        { name: HOME_TOUCH_CLEARING, frame: 25 },
        { name: HOME_TOUCH_ATTACKING, frame: 30 },
        { name: AWAY_TOUCH_CLEARING, frame: 35 }
      ]
    };
    
    expect(calculateTeamPossessions(video, 'home')).toBe(2);
  });

  it('should ignore non-touch tags', () => {
    const video = {
      tags: [
        { name: 'start', frame: 5 },
        { name: HOME_TOUCH_CLEARING, frame: 10 },
        { name: HOME_TOUCH_CLEARING, frame: 12 },
        { name: 'other', frame: 15 },
        { name: AWAY_TOUCH_CLEARING, frame: 20 },
        { name: 'other', frame: 25 }
      ]
    };
    
    expect(calculateTeamPossessions(video, 'home')).toBe(1);
  });
}); 