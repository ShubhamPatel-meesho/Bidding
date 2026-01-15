
'use server';

const BASELINE_ROI = 5; // A typical or average ROI target

// Based on the ObyC (Orders by Clicks) graph, modeling conversion rate throughout the day.
// Higher values indicate peak conversion times. These are normalized around an average of ~0.18.
const pCVR_MODIFIER_BY_HOUR = [
  0.83, // 0h: 0.15
  0.83, // 1h: 0.15
  0.83, // 2h: 0.15
  0.83, // 3h: 0.15
  0.83, // 4h: 0.15
  0.89, // 5h: 0.16
  1.00, // 6h: 0.18
  1.22, // 7h: 0.22
  1.28, // 8h: 0.23 (Peak)
  1.22, // 9h: 0.22
  1.22, // 10h: 0.22
  1.17, // 11h: 0.21
  1.11, // 12h: 0.20
  1.06, // 13h: 0.19
  1.00, // 14h: 0.18
  0.94, // 15h: 0.17
  0.94, // 16h: 0.17
  0.94, // 17h: 0.17
  0.94, // 18h: 0.17
  0.94, // 19h: 0.17
  0.94, // 20h: 0.17
  0.89, // 21h: 0.16
  0.89, // 22h: 0.16
  0.94, // 23h: 0.17
];


// Helper function to generate a random number within a given range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// The pCVR is adjusted based on AOV and the aggressiveness of the Target ROI.
export async function getAdjustedPCVR(targetROI: number, aov: number, hour: number, basePCVR: number, calibrationError: number): Promise<{ adjustedPCVR: number } | { error: string, adjustedPCVR: number }> {
  try {
    // 1. Create a non-linear bias based on how much the targetROI deviates from the baseline.
    // A much higher ROI target implies focusing on a very specific, high-intent audience, increasing pCVR.
    // A lower ROI target is more aggressive, bidding on a wider audience, thus lowering the average pCVR.
    let roiDifference = (targetROI - BASELINE_ROI) / BASELINE_ROI; // a percentage difference
    
    // Use a square root function to make the adjustment less aggressive.
    // Positive difference (high tROI) increases pCVR, negative (low tROI) decreases it.
    let bias = Math.sign(roiDifference) * Math.sqrt(Math.abs(roiDifference)) * 0.20; // 20% influence at its peak

    // Limit the bias to prevent extreme values.
    bias = Math.max(-0.5, Math.min(0.5, bias));

    const biasedPCVR = basePCVR * (1 + bias);

    // 2. Apply the time-of-day modifier
    const timeAdjustedPCVR = biasedPCVR * pCVR_MODIFIER_BY_HOUR[hour];

    // 3. Apply calibration error
    const errorAdjustment = randomInRange(-calibrationError, calibrationError);
    const errorAdjustedPCVR = timeAdjustedPCVR + (basePCVR * errorAdjustment);


    // Add a small amount of randomness to simulate market fluctuations
    const randomizedPCVR = errorAdjustedPCVR * randomInRange(0.95, 1.05);

    return { adjustedPCVR: Math.max(0.001, randomizedPCVR) }; // Ensure pCVR doesn't go to zero or negative
  } catch (e) {
    console.error('Error in getAdjustedPCVR:', e);
    return { error: 'Failed to get adjustment. Using base pCVR.', adjustedPCVR: basePCVR };
  }
}
