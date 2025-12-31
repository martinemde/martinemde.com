import { describe, it, expect } from 'vitest';
import { fractionCalculation, generateVoteGrid, type ThresholdConfig } from './vote';

describe('Vote Threshold Calculations', () => {
  describe('majorityCalculation', () => {
    it('calculates simple majority for odd attendance', () => {
      const majorityCalculation = fractionCalculation(1, 2);
      expect(majorityCalculation(9)).toBe(5); // >50% of 9 is 5
      expect(majorityCalculation(7)).toBe(4); // >50% of 7 is 4
    });

    it('calculates simple majority for even attendance', () => {
      const majorityCalculation = fractionCalculation(1, 2);
      expect(majorityCalculation(10)).toBe(6); // >50% of 10 is 6
      expect(majorityCalculation(6)).toBe(4); // >50% of 6 is 4
    });

    it('handles edge case of single member', () => {
      const majorityCalculation = fractionCalculation(1, 2);
      expect(majorityCalculation(1)).toBe(1);
    });
  });

  describe('fractionCalculation', () => {
    it('calculates 3/5ths supermajority', () => {
      const threeFifths = fractionCalculation(3, 5);
      expect(threeFifths(10)).toBe(6); // 60% of 10 is 6
      expect(threeFifths(9)).toBe(6); // 60% of 9 is 5.4, rounds up to 6
      expect(threeFifths(5)).toBe(3); // 60% of 5 is 3
    });

    it('calculates 2/3rds supermajority', () => {
      const twoThirds = fractionCalculation(2, 3);
      expect(twoThirds(9)).toBe(6); // 66.67% of 9 is 6
      expect(twoThirds(10)).toBe(7); // 66.67% of 10 is 6.67, rounds up to 7
      expect(twoThirds(3)).toBe(2); // 66.67% of 3 is 2
    });

    it('calculates 3/4ths supermajority', () => {
      const threeFourths = fractionCalculation(3, 4);
      expect(threeFourths(8)).toBe(6); // 75% of 8 is 6
      expect(threeFourths(9)).toBe(7); // 75% of 9 is 6.75, rounds up to 7
      expect(threeFourths(4)).toBe(3); // 75% of 4 is 3
    });

    it('handles custom fractions', () => {
      const fourFifths = fractionCalculation(4, 5);
      expect(fourFifths(10)).toBe(8); // 80% of 10 is 8
      expect(fourFifths(9)).toBe(8); // 80% of 9 is 7.2, rounds up to 8
    });
  });

  describe('generateVoteGrid', () => {
    const testThresholds: ThresholdConfig[] = [
      {
        key: 'majority',
        label: 'Majority',
        description: '>50%',
        calculate: fractionCalculation(1, 2)
      },
      {
        key: 'twoThirds',
        label: '2/3rds',
        description: '≥66.67%',
        calculate: fractionCalculation(2, 3)
      }
    ];

    it('generates rows from full committee to quorum', () => {
      const grid = generateVoteGrid(5, 3, testThresholds);

      expect(grid).toHaveLength(3); // 5, 4, 3
      expect(grid[0].attendance).toBe(5);
      expect(grid[1].attendance).toBe(4);
      expect(grid[2].attendance).toBe(3);
    });

    it('caps quorum at committee size', () => {
      const grid = generateVoteGrid(5, 10, testThresholds); // Quorum exceeds size

      expect(grid).toHaveLength(1);
      expect(grid[0].attendance).toBe(5);
    });

    it('calculates all configured thresholds for each row', () => {
      const grid = generateVoteGrid(9, 6, testThresholds);
      const fullCommittee = grid[0];

      expect(fullCommittee.attendance).toBe(9);
      expect(fullCommittee.majority).toBe(5);
      expect(fullCommittee.twoThirds).toBe(6);
    });

    it('works with any threshold configuration', () => {
      const customThresholds: ThresholdConfig[] = [
        {
          key: 'fourFifths',
          label: '4/5ths',
          description: '80%',
          calculate: fractionCalculation(4, 5)
        },
        {
          key: 'unanimous',
          label: 'Unanimous',
          description: '100%',
          calculate: fractionCalculation(1, 1)
        }
      ];

      const grid = generateVoteGrid(10, 8, customThresholds);

      expect(grid[0].fourFifths).toBe(8); // 80% of 10
      expect(grid[0].all).toBe(10);
    });

    it('handles minimum viable committee', () => {
      const grid = generateVoteGrid(1, 1, testThresholds);

      expect(grid).toHaveLength(1);
      expect(grid[0].attendance).toBe(1);
      expect(grid[0].majority).toBe(1);
    });
  });
});
