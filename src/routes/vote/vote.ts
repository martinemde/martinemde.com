/**
 * Vote threshold calculation utilities for governance voting.
 * Configurable system for calculating votes needed based on attendance.
 */

/**
 * Configuration for a voting threshold
 */
export interface ThresholdConfig {
  key: string;
  label: string;
  description: string;
  calculate: (attendance: number) => number;
}

/**
 * Row in the vote threshold grid
 */
export interface VoteThresholdRow {
  attendance: number;
  [key: string]: number; // Dynamic threshold values
}

/**
 * Generate a grid of vote thresholds for all attendance levels
 * from full committee size down to minimum quorum.
 *
 * @param committeeSize - Total number of committee members
 * @param quorum - Minimum members required to hold a vote
 * @param thresholds - Array of threshold configurations to calculate
 * @returns Array of rows with attendance and calculated thresholds
 */
export function generateVoteGrid(
  committeeSize: number,
  quorum: number,
  thresholds: ThresholdConfig[]
): VoteThresholdRow[] {
  const effectiveQuorum = Math.min(quorum, committeeSize);
  const rows: VoteThresholdRow[] = [];

  for (let attendance = committeeSize; attendance >= effectiveQuorum; attendance--) {
    const row: VoteThresholdRow = { attendance };

    // Calculate each threshold for this attendance level
    for (const threshold of thresholds) {
      row[threshold.key] = threshold.calculate(attendance);
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Calculate majorities based on fraction (numerator/denominator)
 * Always rounds UP to ensure threshold is met
 */
export const fractionCalculation =
  (numerator: number, denominator: number) =>
  (attendance: number): number =>
    Math.ceil((attendance * numerator) / denominator);
