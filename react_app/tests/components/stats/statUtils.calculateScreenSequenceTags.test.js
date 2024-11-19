import { describe, it, expect } from 'vitest';
import { calculateScreenSequenceTags } from '../../../src/components/stats/statUtils';
import {
  HOME_TOUCH_ATTACKING,
  HOME_TOUCH_CLEARING,
  AWAY_TOUCH_ATTACKING,
  AWAY_TOUCH_CLEARING
} from '../../../src/constants/tagNames';

describe('calculateScreenSequenceTags', () => {
  const SCREEN_TAG = 'screen';

  it('should return empty array for null tags', () => {
    expect(calculateScreenSequenceTags(null, SCREEN_TAG)).toEqual([]);
  });

  it('should return empty array for null screen tag name', () => {
    expect(calculateScreenSequenceTags([], null)).toEqual([]);
  });

  it('should handle out of order tags by frame number', () => {
    const tags = [
      { name: AWAY_TOUCH_CLEARING, frame: 30 },
      { name: HOME_TOUCH_ATTACKING, frame: 10 }, 
      { name: SCREEN_TAG, frame: 25 },
      { name: HOME_TOUCH_ATTACKING, frame: 20 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 }
    ];

    const result = calculateScreenSequenceTags(tags, SCREEN_TAG);
    
    expect(result).toHaveLength(1);
    expect(result[0].metadata.touches).toHaveLength(4);
    expect(result[0].startFrame).toBe(15);
    expect(result[0].endFrame).toBe(30);
    expect(result[0].metadata.touches[0].frame).toBe(15);
    expect(result[0].metadata.touches[1].frame).toBe(20);
    expect(result[0].metadata.touches[2].frame).toBe(25);
    expect(result[0].metadata.touches[3].frame).toBe(30);
  });

  it('should capture 2 touches before and 1 after screen', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 },
      { name: HOME_TOUCH_ATTACKING, frame: 20 },
      { name: SCREEN_TAG, frame: 25 },
      { name: AWAY_TOUCH_CLEARING, frame: 30 },
      { name: HOME_TOUCH_ATTACKING, frame: 35 }
    ];

    const result = calculateScreenSequenceTags(tags, SCREEN_TAG);
    
    expect(result).toHaveLength(1);
    expect(result[0].metadata.touches).toHaveLength(4);
    expect(result[0].startFrame).toBe(15);
    expect(result[0].endFrame).toBe(30);
  });

  it('should handle screen at start of sequence', () => {
    const tags = [
      { name: SCREEN_TAG, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 }
    ];

    const result = calculateScreenSequenceTags(tags, SCREEN_TAG);
    
    expect(result[0].metadata.touches).toHaveLength(2);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(15);
  });

  it('should handle screen at end of sequence', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: AWAY_TOUCH_CLEARING, frame: 15 },
      { name: SCREEN_TAG, frame: 20 }
    ];

    const result = calculateScreenSequenceTags(tags, SCREEN_TAG);
    
    expect(result[0].metadata.touches).toHaveLength(3);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(20);
  });

  it('should handle multiple screen sequences', () => {
    const tags = [
      { name: HOME_TOUCH_ATTACKING, frame: 10 },
      { name: SCREEN_TAG, frame: 15 },
      { name: AWAY_TOUCH_CLEARING, frame: 20 },
      { name: HOME_TOUCH_ATTACKING, frame: 25 },
      { name: SCREEN_TAG, frame: 30 },
      { name: AWAY_TOUCH_CLEARING, frame: 35 }
    ];

    const result = calculateScreenSequenceTags(tags, SCREEN_TAG);
    
    expect(result).toHaveLength(2);
  });
}); 