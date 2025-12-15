'use server';

import { adjustPCVRWithTargetROI } from '@/ai/flows/adjust-pcvr-with-target-roi';

const AVG_PCVR = 0.01; // 1.00%
const BASELINE_ROI = 500; // 500%

export async function getAdjustedPCVR(targetROI: number): Promise<{ adjustedPCVR: number } | { error: string }> {
  try {
    const result = await adjustPCVRWithTargetROI({
      targetROI: targetROI,
      basePCVR: AVG_PCVR,
      baselineROI: BASELINE_ROI,
    });
    return { adjustedPCVR: result.adjustedPCVR };
  } catch (e) {
    console.error('AI Flow Error:', e);
    return { error: 'Failed to get adjustment from AI. Using base pCVR.' };
  }
}
