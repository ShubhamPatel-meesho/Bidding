'use server';

const BASE_PCVR = 0.015; // Start with a higher base pCVR
const BASE_AOV = 300; // The AOV at which BASE_PCVR is applicable
const BASELINE_ROI = 5; // 5x

// Helper function to generate a random number within a given range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// The pCVR is now adjusted based on AOV. As AOV increases, pCVR decreases.
export async function getAdjustedPCVR(targetROI: number, aov: number): Promise<{ adjustedPCVR: number } | { error: string, adjustedPCVR: number }> {
  try {
    // Adjust base pCVR based on AOV. For every 100 rupees increase in AOV over the base, decrease pCVR by 10% of the base.
    const aovFactor = Math.max(0, (aov - BASE_AOV) / 100);
    const aovAdjustedPCVR = BASE_PCVR * (1 - (aovFactor * 0.1));

    let bias = 0;
    if (targetROI > BASELINE_ROI) {
      bias = 0.1; // Positive bias, increase pCVR by 10%
    } else if (targetROI < BASELINE_ROI) {
      bias = -0.1; // Negative bias, decrease pCVR by 10%
    }

    const finalAdjustedPCVR = aovAdjustedPCVR * (1 + bias) * randomInRange(0.9, 1.1);
    
    return { adjustedPCVR: Math.max(0.001, finalAdjustedPCVR) }; // Ensure pCVR doesn't go to zero or negative
  } catch (e) {
    console.error('Error in getAdjustedPCVR:', e);
    return { error: 'Failed to get adjustment. Using base pCVR.', adjustedPCVR: BASE_PCVR };
  }
}
