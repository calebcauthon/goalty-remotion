import { calculateTags } from '../../../src/components/processing/ScoringPossessionProcessor';
import {
  HOME,
  HOME_TOUCH_ATTACKING,
  HOME_SCORE,
  HOME_SCORING_POSSESSION,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING
} from '../../../src/constants/tagNames';

describe('calculateTags', () => {
  it('should return empty array for null tags', () => {
    expect(calculateTags(null, HOME)).toEqual([]);
  });

  it('should calculate scoring sequence correctly', () => {
    const mockTags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_SCORE, frame: 20 },
      { name: 'some_other_tag', frame: 17 } // Should be ignored
    ];

    const result = calculateTags(mockTags, HOME);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(HOME_SCORING_POSSESSION);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(20);
    expect(result[0].metadata.touchCount).toBe(3);
    expect(result[0].metadata.touches).toEqual([
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_SCORE, frame: 20 }
    ]);
  });

  it('should handle multiple scoring sequences', () => {
    const mockTags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_SCORE, frame: 20 },
      { name: HOME_TOUCH_ATTACKING, frame: 30 },
      { name: HOME_TOUCH_ATTACKING, frame: 35 },
      { name: HOME_SCORE, frame: 40 }
    ];

    const result = calculateTags(mockTags, HOME);
    
    expect(result).toHaveLength(2);
    expect(result[1].metadata.touchCount).toBe(3);
    expect(result[1].metadata.touches[0].frame).toEqual(30);
    expect(result[1].metadata.touches[1].frame).toEqual(35);
    expect(result[1].metadata.touches[2].frame).toEqual(40);
  });

  it('should ignore sequences without score', () => {
    const mockTags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: HOME_TOUCH_ATTACKING, frame: 15 }
    ];

    const result = calculateTags(mockTags, HOME);
    
    expect(result).toHaveLength(0);
  });

  it('should break on opponent clearing touch', () => {
    const mockTags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 },
      { name: HOME_SCORE, frame: 20 }
    ];

    const result = calculateTags(mockTags, HOME);
    
    expect(result).toHaveLength(0);
  });

  it('should break on opponent attacking touches', () => {
    const mockTags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_ATTACKING, frame: 15 },
      { name: HOME_SCORE, frame: 20 }
    ];

    const result = calculateTags(mockTags, HOME);
    
    expect(result).toHaveLength(0);
  });
}); 