import { findTurnoverSequences } from '../../../src/components/stats/statUtils';
import {
  HOME_TOUCH_ATTACKING,
  HOME_TOUCH_CLEARING,
  HOME_TURNOVER,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING
} from '../../../src/constants/tagNames';

describe('findTurnoverSequences', () => {
  // Basic input handling
  it('should return empty array for null tags', () => {
    expect(findTurnoverSequences(null, 'home_touch_')).toEqual([]);
  });

  it('should return empty array for empty tags', () => {
    expect(findTurnoverSequences([], 'home_touch_')).toEqual([]);
  });

  // Simple sequences
  it('should find basic turnover sequence', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: AWAY_TOUCH_CLEARING, frame: 20 }
    ];

    const result = findTurnoverSequences(tags, 'home_touch_', 3);
    
    expect(result).toHaveLength(1);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(15);
    expect(result[0].metadata.touches).toHaveLength(2);
  });

  it('should respect maxPrecedingTouches limit', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 5 },
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_TOUCH_ATTACKING, frame: 20 },
      { name: AWAY_TOUCH_CLEARING, frame: 25 }
    ];

    const result = findTurnoverSequences(tags, 'home_touch_', 2);
    
    expect(result[0].metadata.touches).toHaveLength(2);
    expect(result[0].startFrame).toBe(15);
    expect(result[0].endFrame).toBe(20);
  });

  // Complex scenarios
  it('should handle interleaved opponent touches', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_TOUCH_ATTACKING, frame: 20 },
      { name: HOME_TOUCH_CLEARING, frame: 25 }
    ];

    const result = findTurnoverSequences(tags, 'home_touch_', 3);
    
    expect(result).toHaveLength(0); // sequence broken by opponent touch
  });

  it('should find multiple turnover sequences', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 20 },
      { name: HOME_TOUCH_ATTACKING, frame: 30 },
      { name: HOME_TOUCH_ATTACKING, frame: 35 },
      { name: AWAY_TOUCH_CLEARING, frame: 40 }
    ];

    const result = findTurnoverSequences(tags, 'home_touch_', 3);
    
    expect(result).toHaveLength(2);
    expect(result[1].metadata.touches).toHaveLength(2);
    expect(result[1].startFrame).toBe(30);
    expect(result[1].endFrame).toBe(35);
  });


  it('should handle edge case with consecutive clearing touches', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: AWAY_TOUCH_CLEARING, frame: 20 },
      { name: AWAY_TOUCH_CLEARING, frame: 25 } // Second clearing touch
    ];

    const result = findTurnoverSequences(tags, 'home_touch_', 3);
    
    expect(result).toHaveLength(1);
    expect(result[0].endFrame).toBe(15);
  });
}); 