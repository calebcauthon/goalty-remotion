import { describe, it, expect } from 'vitest';
import { findPlayerSequences } from '../../../src/components/stats/statUtils';

describe('findPlayerSequences', () => {
  it('should return empty array for null video', () => {
    expect(findPlayerSequences(null, 'player1')).toEqual([]);
  });

  it('should find basic player sequence', () => {
    const video = {
      boxes: Array(14).fill(null).map((_, i) => 
        i >= 10 && i <= 13 ? { 'player1': {} } : null
      )
    };

    const result = findPlayerSequences(video, 'player1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      startFrame: 10,
      endFrame: 13
    });
  });

  it('should ignore sequences shorter than 3 frames', () => {
    const video = {
      boxes: Array(18).fill(null).map((_, i) => 
        (i === 10 || i === 11 || (i >= 15 && i <= 17)) ? { 'player1': {} } : {}
      )
    };

    const result = findPlayerSequences(video, 'player1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      startFrame: 15,
      endFrame: 17
    });
  });

  it('should find multiple sequences', () => {
    const video = {
      boxes: Array(24).fill(null).map((_, i) => 
        ((i >= 10 && i <= 12) || (i >= 20 && i <= 23)) ? { 'player1': {} } : {}
      )
    };

    const result = findPlayerSequences(video, 'player1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      startFrame: 10,
      endFrame: 12
    });
    expect(result[1]).toEqual({
      startFrame: 20,
      endFrame: 23
    });
  });

  it('should handle gaps in frame numbers', () => {
    const video = {
      boxes: Array(53).fill(null).map((_, i) => 
        ((i >= 10 && i <= 12) || (i >= 50 && i <= 52)) ? { 'player1': {} } : {}
      )
    };

    const result = findPlayerSequences(video, 'player1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      startFrame: 10,
      endFrame: 12
    });
    expect(result[1]).toEqual({
      startFrame: 50,
      endFrame: 52
    });
  });

  it('should handle multiple players in boxes', () => {
    const video = {
      boxes: Array(14).fill(null).map((_, i) => {
        if (i >= 10 && i <= 12) return { 'player1': {}, 'player2': {} };
        if (i === 13) return { 'player2': {} };
        return null;
      })
    };

    const result = findPlayerSequences(video, 'player1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      startFrame: 10,
      endFrame: 12
    });
  });
}); 