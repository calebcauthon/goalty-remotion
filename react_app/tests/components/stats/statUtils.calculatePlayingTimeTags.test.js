import { describe, it, expect } from 'vitest';
import { calculatePlayingTimeTags } from '../../../src/components/stats/statUtils';

describe('calculatePlayingTimeTags', () => {
  const PLAYER = 'john';
  const PLAYER_IN = `${PLAYER} IN`;
  const PLAYER_OUT = `${PLAYER} OUT`;
  const PLAYER_PLAYING = `${PLAYER} playing`;

  it('should return empty array for null tags', () => {
    expect(calculatePlayingTimeTags(null, PLAYER)).toEqual([]);
  });

  it('should return empty array for null player name', () => {
    expect(calculatePlayingTimeTags([], null)).toEqual([]);
  });

  it('should calculate basic playing time sequence', () => {
    const tags = [
      { name: PLAYER_IN, frame: 10 },
      { name: PLAYER_OUT, frame: 20 }
    ];

    const result = calculatePlayingTimeTags(tags, PLAYER);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: PLAYER_PLAYING,
      startFrame: 10,
      endFrame: 20,
      metadata: {
        touchCount: 2,
        touches: [
          { name: PLAYER_IN, frame: 10 },
          { name: PLAYER_OUT, frame: 20 }
        ]
      }
    });
  });

  it('should handle multiple playing sequences', () => {
    const tags = [
      { name: PLAYER_IN, frame: 10 },
      { name: PLAYER_OUT, frame: 20 },
      { name: PLAYER_IN, frame: 30 },
      { name: PLAYER_OUT, frame: 40 }
    ];

    const result = calculatePlayingTimeTags(tags, PLAYER);
    
    expect(result).toHaveLength(2);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(20);
    expect(result[1].startFrame).toBe(30);
    expect(result[1].endFrame).toBe(40);
  });

  it('should ignore irrelevant tags', () => {
    const tags = [
      { name: PLAYER_IN, frame: 10 },
      { name: 'other_player IN', frame: 15 },
      { name: PLAYER_OUT, frame: 20 }
    ];

    const result = calculatePlayingTimeTags(tags, PLAYER);
    
    expect(result).toHaveLength(1);
    expect(result[0].metadata.touches).toHaveLength(2);
  });

  it('should handle incomplete sequences', () => {
    const tags = [
      { name: PLAYER_IN, frame: 10 },
      { name: PLAYER_IN, frame: 15 }, // Second IN without OUT
      { name: PLAYER_OUT, frame: 20 }
    ];

    const result = calculatePlayingTimeTags(tags, PLAYER);
    
    expect(result).toHaveLength(1);
    expect(result[0].startFrame).toBe(10);
    expect(result[0].endFrame).toBe(20);
  });
}); 