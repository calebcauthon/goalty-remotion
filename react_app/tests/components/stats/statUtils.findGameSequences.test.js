import { describe, it, expect } from 'vitest';
import { findGameSequences } from '../../../src/components/stats/statUtils';

describe('findGameSequences', () => {
  it('should find game sequences between start and end tags', () => {
    const tags = [
      { name: 'game_start', frame: 100 },
      { name: 'some_other_tag', frame: 150 },
      { name: 'game_end', frame: 200 },
      { name: 'game_start', frame: 300 },
      { name: 'game_end', frame: 400 }
    ];

    const expected = [
      {
        startFrame: 100,
        endFrame: 200,
        metadata: {
          gameNumber: 1,
          duration: 100
        }
      },
      {
        startFrame: 300,
        endFrame: 400,
        metadata: {
          gameNumber: 2,
          duration: 100
        }
      }
    ];

    expect(findGameSequences(tags)).toEqual(expected);
  });

  it('should handle no game sequences', () => {
    const tags = [
      { name: 'some_tag', frame: 100 },
      { name: 'other_tag', frame: 200 }
    ];

    expect(findGameSequences(tags)).toEqual([]);
  });

  it('should handle unpaired game tags', () => {
    const tags = [
      { name: 'game_start', frame: 100 },
      { name: 'game_start', frame: 200 }
    ];

    expect(findGameSequences(tags)).toEqual([]);
  });
}); 