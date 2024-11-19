import { describe, it, expect } from 'vitest';
import { findTeamAttackSequences } from '../../../src/components/stats/statUtils';

describe('findTeamAttackSequences', () => {
  it('should return empty array for null video', () => {
    expect(findTeamAttackSequences(null, 'home')).toEqual([]);
  });

  it('should find basic attack sequence', () => {
    const video = {
      tags: [
        { name: 'home_touch_clearing', frame: 10 },
        { name: 'home_touch_attacking', frame: 15 },
        { name: 'home_touch_attacking', frame: 19 },
        { name: 'score', frame: 20 }
      ]
    };

    const result = findTeamAttackSequences(video, 'home');
    
    expect(result).toHaveLength(1);
    expect(result[0].startFrame).toBe(15);
    expect(result[0].endFrame).toBe(20);
    expect(result[0].touches).toEqual([
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'home_touch_attacking', frame: 19 },
      { name: 'score', frame: 20 }
    ]);
    expect(result[0].scored).toBe(true);
  });

  it('should require clearing touch before attacking touch', () => {
    const video = {
      tags: [
        { name: 'home_touch_attacking', frame: 10 },
        { name: 'home_touch_attacking', frame: 15 }
      ]
    };

    const result = findTeamAttackSequences(video, 'home');
    expect(result).toHaveLength(0);
  });

  it('should break sequence on opponent touch', () => {
    const video = {
      tags: [
        { name: 'home_touch_clearing', frame: 10 },
        { name: 'home_touch_attacking', frame: 15 },
        { name: 'home_touch_attacking', frame: 18 },
        { name: 'away_touch_clearing', frame: 20 },
        { name: 'score', frame: 25 }
      ]
    };

    const result = findTeamAttackSequences(video, 'home');
    expect(result).toHaveLength(1);
    expect(result[0].startFrame).toBe(15);
    expect(result[0].endFrame).toBe(18);
    expect(result[0].scored).toBe(false);
  });

  it('should find multiple sequences', () => {
    const video = {
      tags: [
        { name: 'home_touch_clearing', frame: 10 },
        { name: 'home_touch_attacking', frame: 15 },
        { name: 'home_touch_attacking', frame: 18 },
        { name: 'score', frame: 20 },
        { name: 'home_touch_clearing', frame: 30 },
        { name: 'home_touch_attacking', frame: 35 },
        { name: 'home_touch_attacking', frame: 40 },
        { name: 'away_touch_clearing', frame: 45 }
      ]
    };

    const result = findTeamAttackSequences(video, 'home');
    expect(result).toHaveLength(2);
    expect(result[0].scored).toBe(true);
    expect(result[1].scored).toBe(false);
  });

  it('should handle interleaved team sequences', () => {
    const video = {
      tags: [
        { name: 'home_touch_clearing', frame: 10 },
        { name: 'home_touch_attacking', frame: 15 },
        { name: 'home_touch_attacking', frame: 17 },
        { name: 'away_touch_clearing', frame: 20 },
        { name: 'away_touch_attacking', frame: 25 },
        { name: 'away_touch_attacking', frame: 27 },
        { name: 'home_touch_clearing', frame: 30 },
        { name: 'home_touch_attacking', frame: 35 },
        { name: 'home_touch_attacking', frame: 37 },
        { name: 'away_touch_clearing', frame: 40 }
      ]
    };

    const homeResult = findTeamAttackSequences(video, 'home');
    expect(homeResult).toHaveLength(2);
  });
}); 