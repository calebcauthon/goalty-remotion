import { describe, it, expect } from 'vitest';
import { calculateAttackSequenceTags } from '../../../src/components/stats/statUtils';

describe('calculateAttackSequenceTags', () => {
  it('should return empty array for null input', () => {
    expect(calculateAttackSequenceTags(null, 'home')).toEqual([]);
  });

  it('should find basic attack sequence', () => {
    const tags = [
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'home_touch_attacking', frame: 20 },
      { name: 'home_touch_clearing', frame: 25 }
    ];

    const result = calculateAttackSequenceTags(tags, 'home');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'score',
      frame: 21
    });
  });

  it('should ignore non-attacking/clearing tags', () => {
    const tags = [
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'some_other_tag', frame: 12 },
      { name: 'random_event', frame: 14 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'irrelevant_tag', frame: 18 },
      { name: 'home_touch_clearing', frame: 20 }
    ];

    const result = calculateAttackSequenceTags(tags, 'home');
    expect(result).toHaveLength(1);
    expect(result[0].frame).toBe(16);
  });

  it('should find multiple attack sequences ignoring other tags', () => {
    const tags = [
      { name: 'game_start', frame: 5 },
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'random_tag', frame: 12 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'home_touch_attacking', frame: 18 },
      { name: 'home_touch_clearing', frame: 20 },
      { name: 'some_event', frame: 25 },
      // Second sequence
      { name: 'home_touch_attacking', frame: 30 },
      { name: 'irrelevant_tag', frame: 32 },
      { name: 'home_touch_attacking', frame: 35 },
      { name: 'home_touch_attacking', frame: 38 },
      { name: 'home_touch_clearing', frame: 40 }
    ];

    const result = calculateAttackSequenceTags(tags, 'home');
    expect(result).toHaveLength(2);
    expect(result[0].frame).toBe(19);
    expect(result[1].frame).toBe(39);
  });

  it('should break sequence on opponent touches', () => {
    const tags = [
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'random_tag', frame: 12 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'away_touch_attacking', frame: 18 },
      { name: 'home_touch_clearing', frame: 20 }
    ];

    const result = calculateAttackSequenceTags(tags, 'home');
    expect(result).toHaveLength(0);
  });

  it('should only create score when no opponent touches between attacks and clear', () => {
    const tags = [
      { name: 'game_start', frame: 5 },
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'random_event', frame: 12 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'home_touch_attacking', frame: 18 },
      { name: 'home_touch_clearing', frame: 20 },
      { name: 'some_tag', frame: 25 },
      // Second sequence with opponent touch
      { name: 'home_touch_attacking', frame: 30 },
      { name: 'irrelevant_tag', frame: 32 },
      { name: 'home_touch_attacking', frame: 35 },
      { name: 'away_touch_attacking', frame: 38 },
      { name: 'home_touch_clearing', frame: 45 }
    ];

    const result = calculateAttackSequenceTags(tags, 'home');
    expect(result).toHaveLength(1);
    expect(result[0].frame).toBe(19); // Only from first sequence
  });
}); 