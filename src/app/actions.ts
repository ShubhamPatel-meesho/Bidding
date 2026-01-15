
'use server';

const BASELINE_ROI = 15; // A typical or average ROI target

// Based on the ObyC (Orders by Clicks) graph. These values are now normalized
// so their average is ~1.0. This makes the `basePCVR` a true average baseline.
const pCVR_MODIFIER_BY_HOUR = [
  0.79, // 0h
  0.79, // 1h
  0.79, // 2h
  0.79, // 3h
  0.79, // 4h
  0.84, // 5h
  0.95, // 6h
  1.16, // 7h
  1.21, // 8h (Peak)
  1.16, // 9h
  1.16, // 10h
  1.11, // 11h
  1.05, // 12h
  1.00, // 13h
  0.95, // 14h
  0.89, // 15h
  0.89, // 16h
  0.89, // 17h
  0.89, // 18h
  0.89, // 19h
  0.89, // 20h
  0.84, // 21h
  0.84, // 22h
  0.89, // 23h
];


// Helper function to generate a random number within a given range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// The pCVR is adjusted based on AOV and the aggressiveness of the Target ROI.
export async function getAdjustedPCVR(targetROI: number, aov: number, hour: number, basePCVR: number, calibrationError: number): Promise<{ adjustedPCVR: number } | { error: string, adjustedPCVR: number }> {
  try {
    // 1. Apply a subtle ROI target bias using a logarithmic scale for diminishing returns
    const roiRatio = targetROI / BASELINE_ROI;
    const roiBias = Math.log(Math.max(1, roiRatio)) * 0.1; // Small factor (0.1)
    const biasedPCVR = basePCVR * (1 + roiBias);

    // 2. Apply the time-of-day modifier
    const timeAdjustedPCVR = biasedPCVR * pCVR_MODIFIER_BY_HOUR[hour];

    // 3. Apply calibration error as a multiplicative factor.
    // A 100% error (calibrationError = 1.0) will result in a multiplier between 0x and 2x.
    const errorMultiplier = 1 + randomInRange(-calibrationError, calibrationError);
    const errorAdjustedPCVR = timeAdjustedPCVR * errorMultiplier;

    return { adjustedPCVR: Math.max(0.0001, errorAdjustedPCVR) }; // Ensure pCVR doesn't go below a very small number
  } catch (e) {
    console.error('Error in getAdjustedPCVR:', e);
    return { error: 'Failed to get adjustment. Using base pCVR.', adjustedPCVR: basePCVR };
  }
}
