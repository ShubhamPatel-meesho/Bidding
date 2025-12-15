'use server';

const AVG_PCVR = 0.01; // 1.00%
const BASELINE_ROI = 5; // 5x

// Helper function to generate a random number within a given range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

export async function getAdjustedPCVR(targetROI: number): Promise<{ adjustedPCVR: number } | { error: string }> {
  try {
    let bias = 0;
    if (targetROI > BASELINE_ROI) {
      bias = 0.1; // Positive bias, increase pCVR by 10%
    } else if (targetROI < BASELINE_ROI) {
      bias = -0.1; // Negative bias, decrease pCVR by 10%
    }

    const adjustedPCVR = AVG_PCVR * (1 + bias) * randomInRange(0.9, 1.1);
    
    return { adjustedPCVR: adjustedPCVR };
  } catch (e) {
    console.error('Error in getAdjustedPCVR:', e);
    // Even with a simpler function, it's good practice to have error handling.
    // In this case, we fall back to the average pCVR.
    return { error: 'Failed to get adjustment. Using base pCVR.', adjustedPCVR: AVG_PCVR };
  }
}
