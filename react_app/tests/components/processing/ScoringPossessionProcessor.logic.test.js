import { findValidSequences } from '../../../src/components/processing/ScoringPossessionProcessor';

describe('ScoringPossessionProcessor Logic', () => {
  describe('findValidSequences - home team only', () => {
    const scenarios = [
      [
        { name: 'home_clearing', frame: 50 },
        { name: 'home_attacking', frame: 100 },
        { name: 'home_score', frame: 150 }
      ],
      [
        { name: 'home_clearing', frame: 50 },
        { name: 'home_attacking', frame: 100 },
        { name: 'home_attacking', frame: 125 },
        { name: 'home_score', frame: 150 }
      ],
      [
        { name: 'home_clearing', frame: 50 },
        { name: 'home_clearing', frame: 55 },
        { name: 'home_attacking', frame: 100 },
        { name: 'home_attacking', frame: 125 },
        { name: 'home_score', frame: 150 }
      ]
    ].forEach((scenario) => {
      test('finds valid sequence when tags are in correct order', () => {
        const tags = scenario;

        const result = findValidSequences(
          tags,
          'home_clearing',
          'home_score',
          [],
          'home_scoring_possession'
        );

        expect(result).toEqual([
          {
            name: 'home_scoring_possession',
            startFrame: 50,
            endFrame: 150
          }
        ]);
      });
    });

    [
      [
        { name: 'home_clearing', frame: 45 },
        { name: 'away_clearing', frame: 50 },
        { name: 'home_clearing', frame: 55 }, // start
        { name: 'home_attacking', frame: 100 },
        { name: 'home_score', frame: 150 }
      ]
    ].forEach((scenario) => {
      test('finds valid sequence when tags are in correct order', () => {
        const tags = scenario;

        const result = findValidSequences(
          tags,
          'home_clearing',
          'home_score',
          ['away_clearing'],
          'home_scoring_possession'
        );

        expect(result).toEqual([
          {
            name: 'home_scoring_possession',
            startFrame: 55,
            endFrame: 150
          }
        ]);
      });
    });

//    test('ignores sequence when exclude tag is present', () => {
//      const tags = [
//        { name: 'home_attacking', frame: 100 },
//        { name: 'away_attacking', frame: 125 },
//        { name: 'home_score', frame: 150 }
//      ];
//
//      const result = findValidSequences(
//        tags,
//        'home_attacking',
//        'home_score',
//        'away_attacking',
//        'scoring_possession'
//      );
//
//      expect(result).toHaveLength(0);
//    });
//
//    test('handles multiple valid sequences', () => {
//      const tags = [
//        { name: 'home_attacking', frame: 100 },
//        { name: 'home_score', frame: 150 },
//        { name: 'home_attacking', frame: 200 },
//        { name: 'home_score', frame: 250 }
//      ];
//
//      const result = findValidSequences(
//        tags,
//        'home_attacking',
//        'home_score',
//        'away_attacking',
//        'scoring_possession'
//      );
//
//      expect(result).toHaveLength(2);
//      expect(result).toEqual([
//        {
//          name: 'scoring_possession',
//          startFrame: 100,
//          endFrame: 150
//        },
//        {
//          name: 'scoring_possession',
//          startFrame: 200,
//          endFrame: 250
//        }
//      ]);
//    });
//
//    test('handles unsorted input tags', () => {
//      const tags = [
//        { name: 'home_clearing', frame: 99 },
//        { name: 'home_score', frame: 150 },
//        { name: 'home_attacking', frame: 100 }
//      ];
//
//      const result = findValidSequences(
//        tags,
//        'home_attacking',
//        'home_score',
//        'away_attacking',
//        'scoring_possession'
//      );
//
//      expect(result).toEqual([
//        {
//          name: 'scoring_possession',
//          startFrame: 99,
//          endFrame: 150
//        }
//      ]);
//    });
//
//    test('handles empty tags array', () => {
//      const result = findValidSequences(
//        [],
//        'home_attacking',
//        'home_score',
//        'away_attacking',
//        'scoring_possession'
//      );
//
//      expect(result).toEqual([]);
//    });
//
//    test('handles sequence with no end tag', () => {
//      const tags = [
//        { name: 'home_attacking', frame: 100 },
//        { name: 'away_attacking', frame: 150 }
//      ];
//
//      const result = findValidSequences(
//        tags,
//        'home_attacking',
//        'home_score',
//        'away_attacking',
//        'scoring_possession'
//      );
//
//      expect(result).toEqual([]);
//    });
//
//    test('handles different tag name patterns', () => {
//      const tags = [
//        { name: 'start_event', frame: 100 },
//        { name: 'middle_event', frame: 125 },
//        { name: 'end_event', frame: 150 }
//      ];
//
//      const result = findValidSequences(
//        tags,
//        'start_event',
//        'end_event',
//        'exclude_event',
//        'custom_sequence'
//      );
//
//      expect(result).toEqual([
//        {
//          name: 'custom_sequence',
//          startFrame: 100,
//          endFrame: 150
//        }
//      ]);
//    });
  });
}); 