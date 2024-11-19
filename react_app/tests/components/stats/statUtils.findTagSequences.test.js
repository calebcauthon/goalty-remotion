import { findTagSequences } from '../../../src/components/stats/statUtils';
import {
  HOME_TOUCH_ATTACKING,
  HOME_SCORE,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING,
  AWAY_SCORE
} from '../../../src/constants/tagNames';

describe('findTagSequences', () => {
  // Basic input handling
  it('should return empty array for null tags', () => {
    expect(findTagSequences(null, HOME_TOUCH_ATTACKING, [HOME_SCORE])).toEqual([]);
  });

  it('should return empty array for empty tags', () => {
    expect(findTagSequences([], HOME_TOUCH_ATTACKING, [HOME_SCORE])).toEqual([]);
  });

  // Simple sequences
  it('should find basic two-tag sequence', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_SCORE, frame: 20 }
    ];

    const result = findTagSequences(tags, HOME_TOUCH_ATTACKING, [HOME_SCORE]);
    
    expect(result).toHaveLength(1);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(20);
  });

  it('should find sequence with one intermediate touch', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_SCORE, frame: 20 }
    ];

    const result = findTagSequences(tags, HOME_TOUCH_ATTACKING, [HOME_SCORE]);
    
    expect(result[0].touches).toHaveLength(3);
  });

  // Multiple sequences
  it('should find multiple simple sequences', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_SCORE, frame: 20 },
      { name: HOME_TOUCH_ATTACKING, frame: 30 },
      { name: HOME_SCORE, frame: 40 }
    ];

    const result = findTagSequences(tags, HOME_TOUCH_ATTACKING, [HOME_SCORE]);
    
    expect(result).toHaveLength(2);
  });

  // Sequence breaking
  it('should break sequence on specified break tag', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 },
      { name: HOME_SCORE, frame: 20 }
    ];

    const result = findTagSequences(
      tags, 
      HOME_TOUCH_ATTACKING, 
      [HOME_SCORE], 
      [AWAY_TOUCH_CLEARING]
    );
    
    expect(result).toHaveLength(0);
  });

  // Complex scenarios
  it('should handle interleaved team sequences', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_TOUCH_ATTACKING, frame: 20 },
      { name: HOME_SCORE, frame: 25 },
      { name: AWAY_TOUCH_ATTACKING, frame: 30 },
      { name: AWAY_SCORE, frame: 35 }
    ];

    const homeResult = findTagSequences(tags, HOME_TOUCH_ATTACKING, [HOME_SCORE]);
    const awayResult = findTagSequences(tags, AWAY_TOUCH_ATTACKING, [AWAY_SCORE]);
    
    expect(homeResult).toHaveLength(1);
    expect(awayResult).toHaveLength(1);
  });

  it('should handle multiple break conditions', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_SCORE, frame: 20 },
      { name: HOME_TOUCH_ATTACKING, frame: 30 },
      { name: AWAY_TOUCH_CLEARING, frame: 35 },
      { name: HOME_SCORE, frame: 40 }
    ];

    const result = findTagSequences(
      tags, 
      HOME_TOUCH_ATTACKING, 
      [HOME_SCORE], 
      [AWAY_TOUCH_CLEARING, AWAY_TOUCH_ATTACKING]
    );
    
    expect(result).toHaveLength(1);
    expect(result[0].endFrame).toBe(20);
  });
}); 