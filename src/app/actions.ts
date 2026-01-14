
'use server';

const BASE_PCVR = 0.015; // The pCVR for a "standard" campaign, reverted from 0.025
const BASE_AOV = 300; // The AOV at which BASE_PCVR is applicable
const BASELINE_ROI = 5; // A typical or average ROI target

// Based on click potential, but we can use it to model CVR potential too.
// Peak conversion intent is in the morning.
const pCVR_MODIFIER_BY_WINDOW = [
  0.85, // 0-6h: Lower intent
  1.15, // 6-12h: Peak intent
  1.05, // 12-18h: Still high, but dropping
  0.95, // 18-24h: Dropping off
];


// Helper function to generate a random number within a given range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// The pCVR is adjusted based on AOV and the aggressiveness of the Target ROI.
export async function getAdjustedPCVR(targetROI: number, aov: number, windowIndex: number): Promise<{ adjustedPCVR: number } | { error: string, adjustedPCVR: number }> {
  try {
    // 1. Adjust base pCVR based on AOV. Higher AOV means customers are expected to be more selective.
    // For every 100 rupees increase in AOV over the base, decrease pCVR by 10% of the base.
    const aovFactor = Math.max(0, (aov - BASE_AOV) / 100);
    const aovAdjustedPCVR = BASE_PCVR * (1 - (aovFactor * 0.1));

    // 2. Create a non-linear bias based on how much the targetROI deviates from the baseline.
    // A much higher ROI target implies focusing on a very specific, high-intent audience, increasing pCVR.
    // A lower ROI target is more aggressive, bidding on a wider audience, thus lowering the average pCVR.
    let roiDifference = (targetROI - BASELINE_ROI) / BASELINE_ROI; // a percentage difference
    
    // Use a square root function to make the adjustment less aggressive.
    // Positive difference (high tROI) increases pCVR, negative (low tROI) decreases it.
    let bias = Math.sign(roiDifference) * Math.sqrt(Math.abs(roiDifference)) * 0.20; // 20% influence at its peak

    // Limit the bias to prevent extreme values.
    bias = Math.max(-0.5, Math.min(0.5, bias));

    const biasedPCVR = aovAdjustedPCVR * (1 + bias);

    // 3. Apply the time-of-day modifier
    const timeAdjustedPCVR = biasedPCVR * pCVR_MODIFIER_BY_WINDOW[windowIndex];


    // Add a small amount of randomness to simulate market fluctuations
    const randomizedPCVR = timeAdjustedPCVR * randomInRange(0.95, 1.05);

    return { adjustedPCVR: Math.max(0.001, randomizedPCVR) }; // Ensure pCVR doesn't go to zero or negative
  } catch (e) {
    console.error('Error in getAdjustedPCVR:', e);
    return { error: 'Failed to get adjustment. Using base pCVR.', adjustedPCVR: BASE_PCVR };
  }
}

    
