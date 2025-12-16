
import { runSimulation } from './simulation';
import type { OptimizationIteration } from './types';

// --- Configuration for the Hill Climbing Optimizer ---
const MAX_ITERATIONS = 50; // Max number of attempts to find a better solution
const INITIAL_STEP_SIZE = 0.5; // Initial amount to adjust ROI targets by
const STEP_DECAY = 0.98; // Decay factor for the step size
const NEIGHBORHOOD_SIZE = 4; // Number of neighbors to explore in each iteration
const MIN_ROI_TARGET = 1.0;
const MAX_ROI_TARGET = 30.0;
const RANDOM_RESTART_PROBABILITY = 0.05; // Probability of a random restart

interface OptimizationParams {
  aov: number;
  budget: number;
  sellerRoiTarget: number;
  initialRoiTargets: number[];
}

// --- Scoring Function ---
// This function evaluates how "good" a simulation result is.
// It heavily penalizes not meeting the seller's ROI and under-utilizing the budget.
const calculateScore = (
  deliveredROI: number,
  budgetUtilization: number,
  sellerRoiTarget: number
): number => {
  let score = 0;

  // 1. Primary Goal: Meet or exceed the seller's ROI target.
  const roiDeficit = sellerRoiTarget - deliveredROI;
  if (roiDeficit > 0) {
    // Heavy penalty for missing the target. The further away, the worse.
    score -= Math.pow(roiDeficit, 2) * 1000;
  } else {
    // Reward for exceeding the target, but with diminishing returns.
    score += Math.sqrt(deliveredROI - sellerRoiTarget) * 100;
  }

  // 2. Secondary Goal: Utilize the budget effectively (ideally between 95% and 100%).
  if (budgetUtilization < 0.95) {
    // Penalty for under-spending.
    score -= (1 - budgetUtilization) * 500;
  } else if (budgetUtilization > 1.0) {
     // Penalty for over-spending (which simulation logic prevents, but good to have)
    score -= (budgetUtilization - 1) * 1000;
  } else {
    // Reward for being in the sweet spot.
    score += 100;
  }

  return score;
};


// --- The Main Optimization Function ---
export const runOptimization = async (
  params: OptimizationParams,
  onIteration?: (log: OptimizationIteration) => void
): Promise<number[]> => {
  const { aov, budget, sellerRoiTarget, initialRoiTargets } = params;

  let currentRoiTargets = [...initialRoiTargets];
  let currentStepSize = INITIAL_STEP_SIZE;
  let bestScore = -Infinity;
  let bestRoiTargets = [...currentRoiTargets];

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    let foundBetterNeighbor = false;

    // Explore neighbors
    for (let j = 0; j < NEIGHBORHOOD_SIZE; j++) {
        // Create a new set of targets by randomly adjusting the current ones
        const neighborTargets = currentRoiTargets.map(target => {
            const adjustment = (Math.random() * 2 - 1) * currentStepSize;
            const newTarget = target + adjustment;
            // Clamp the target within a reasonable range
            return Math.max(MIN_ROI_TARGET, Math.min(MAX_ROI_TARGET, newTarget));
        });

        // Run simulation with the new "neighbor" targets
        const result = await runSimulation(neighborTargets, aov, budget);
        const { finalDeliveredROI, budgetUtilisation } = result.summary;

        // Score the result
        const score = calculateScore(finalDeliveredROI, budgetUtilisation, sellerRoiTarget);

        // Log the iteration for the UI
        onIteration?.({
            iteration: i * NEIGHBORHOOD_SIZE + j,
            roiTargets: neighborTargets.map(t => parseFloat(t.toFixed(2))),
            budgetUtilization: budgetUtilisation,
            deliveredROI: finalDeliveredROI,
            score,
            isBest: score > bestScore,
        });

        // If this neighbor is better, it becomes the new current best
        if (score > bestScore) {
            bestScore = score;
            bestRoiTargets = [...neighborTargets];
            currentRoiTargets = [...neighborTargets]; // Move to the better state
            foundBetterNeighbor = true;
        }
    }

    // If no better neighbor was found, we might be at a local maximum.
    // Reduce the step size to search more finely.
    if (!foundBetterNeighbor) {
      currentStepSize *= STEP_DECAY;
    }
    
    // Occasionally, jump to a completely new random spot to escape local maxima.
    if (Math.random() < RANDOM_RESTART_PROBABILITY) {
        currentRoiTargets = currentRoiTargets.map(() => MIN_ROI_TARGET + Math.random() * (MAX_ROI_TARGET - MIN_ROI_TARGET));
        currentStepSize = INITIAL_STEP_SIZE; // Reset step size
    }
  }

  // Return the best targets found, rounded for cleanliness
  return bestRoiTargets.map(t => parseFloat(t.toFixed(2)));
};
