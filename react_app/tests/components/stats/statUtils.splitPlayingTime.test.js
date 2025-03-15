import { describe, it, expect } from 'vitest';
import { splitPlayingTimeTags } from '../../../src/components/stats/statUtils';

describe('splitPlayingTimeTags', () => {
  it('should return empty array for null/invalid inputs', () => {
    expect(splitPlayingTimeTags(null, 'player1', 'home')).toEqual([]);
    expect(splitPlayingTimeTags([], null, 'home')).toEqual([]);
    expect(splitPlayingTimeTags([], 'player1', null)).toEqual([]);
  });

  it('should consider prior touch for initial offense/defense state', () => {
    const tags = [
      // Prior touch before playing time starts
      { name: 'home_touch_attacking', frame: 5 },
      { name: 'aaron playing', startFrame: 10, endFrame: 50 },
      { name: 'away_touch_attacking', frame: 30 },
      { name: 'home_touch_attacking', frame: 45 }
    ];

    const result = splitPlayingTimeTags(tags, 'aaron', 'home');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'aaron playing offense',
      startFrame: 10,
      endFrame: 29
    });
    expect(result[1]).toEqual({
      name: 'aaron playing defense',
      startFrame: 30,
      endFrame: 44
    });
    expect(result[2]).toEqual({
      name: 'aaron playing offense',
      startFrame: 45,
      endFrame: 50
    });
  });

  it('should handle case when player is on away team with prior touch', () => {
    const tags = [
      { name: 'away_touch_attacking', frame: 5 },
      { name: 'aaron playing', startFrame: 10, endFrame: 30 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'away_touch_attacking', frame: 25 }
    ];

    const result = splitPlayingTimeTags(tags, 'aaron', 'away');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'aaron playing offense',
      startFrame: 10,
      endFrame: 14
    });
    expect(result[1]).toEqual({
      name: 'aaron playing defense',
      startFrame: 15,
      endFrame: 24
    });

    expect(result[2]).toEqual({
      name: 'aaron playing offense',
      startFrame: 25,
      endFrame: 30
    });
  });

  it('should handle multiple playing tags with prior touches', () => {
    const tags = [
      { name: 'home_touch_attacking', frame: 5 },
      { name: 'aaron playing', startFrame: 10, endFrame: 20 },
      { name: 'away_touch_attacking', frame: 25 },
      { name: 'aaron playing', startFrame: 30, endFrame: 40 },
      { name: 'home_touch_attacking', frame: 35 }
    ];

    const result = splitPlayingTimeTags(tags, 'aaron', 'home');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'aaron playing offense',
      startFrame: 10,
      endFrame: 20
    });
    expect(result[1]).toEqual({
      name: 'aaron playing defense',
      startFrame: 30,
      endFrame: 34
    });
    expect(result[2]).toEqual({
      name: 'aaron playing offense',
      startFrame: 35,
      endFrame: 40
    });
  });

  it('should ignore touches outside playing time ranges', () => {
    const tags = [
      { name: 'aaron playing', startFrame: 20, endFrame: 30 },
      { name: 'home_touch_attacking', frame: 10 },
      { name: 'away_touch_attacking', frame: 40 }
    ];

    const result = splitPlayingTimeTags(tags, 'aaron', 'home');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'aaron playing offense',
      startFrame: 20,
      endFrame: 30
    });
  });

  it('should handle mix of attacking and clearing touches with prior touch', () => {
    const tags = [
      { name: 'away_touch_clearing', frame: 5 },
      { name: 'aaron playing', startFrame: 10, endFrame: 50 },
      { name: 'home_touch_attacking', frame: 15 },
      { name: 'home_touch_clearing', frame: 20 },
      { name: 'away_touch_attacking', frame: 30 },
      { name: 'away_touch_clearing', frame: 35 },
      { name: 'home_touch_attacking', frame: 45 }
    ];

    const result = splitPlayingTimeTags(tags, 'aaron', 'home');
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      name: 'aaron playing defense',
      startFrame: 10,
      endFrame: 14
    });
    expect(result[1]).toEqual({
      name: 'aaron playing offense',
      startFrame: 15,
      endFrame: 29
    });
    expect(result[2]).toEqual({
      name: 'aaron playing defense',
      startFrame: 30,
      endFrame: 44
    });
    expect(result[3]).toEqual({
      name: 'aaron playing offense',
      startFrame: 45,
      endFrame: 50
    });
  });
}); 