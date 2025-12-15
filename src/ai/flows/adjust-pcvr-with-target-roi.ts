'use server';

/**
 * @fileOverview Adjusts the pCVR based on the target ROI.
 *
 * This file exports:
 *   - adjustPCVRWithTargetROI: The main function to adjust pCVR based on target ROI.
 *   - AdjustPCVRWithTargetROIInput: The input type for adjustPCVRWithTargetROI.
 *   - AdjustPCVRWithTargetROIOutput: The output type for adjustPCVRWithTargetROI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustPCVRWithTargetROIInputSchema = z.object({
  targetROI: z
    .number()
    .describe('The target ROI (Return on Investment) as a percentage.'),
  basePCVR: z.number().describe('The base predicted Conversion Rate (pCVR).'),
  baselineROI: z
    .number()
    .default(500)
    .describe('The baseline ROI to compare the target ROI against.'),
});
export type AdjustPCVRWithTargetROIInput = z.infer<
  typeof AdjustPCVRWithTargetROIInputSchema
>;

const AdjustPCVRWithTargetROIOutputSchema = z.object({
  adjustedPCVR: z.number().describe('The adjusted pCVR after applying the bias.'),
});
export type AdjustPCVRWithTargetROIOutput = z.infer<
  typeof AdjustPCVRWithTargetROIOutputSchema
>;

export async function adjustPCVRWithTargetROI(
  input: AdjustPCVRWithTargetROIInput
): Promise<AdjustPCVRWithTargetROIOutput> {
  return adjustPCVRWithTargetROIFlow(input);
}

const adjustPCVRPrompt = ai.definePrompt({
  name: 'adjustPCVRPrompt',
  input: {schema: AdjustPCVRWithTargetROIInputSchema},
  output: {schema: AdjustPCVRWithTargetROIOutputSchema},
  prompt: `You are an expert in advertising performance simulation.

  Given a target ROI and a base pCVR, you will adjust the pCVR based on whether the target ROI is higher or lower than a baseline ROI.

  If the target ROI is higher than the baseline ROI, you will apply a positive bias to the pCVR.
  If the target ROI is lower than the baseline ROI, you will apply a negative bias to the pCVR.

  Target ROI: {{{targetROI}}}
  Base pCVR: {{{basePCVR}}}
  Baseline ROI: {{{baselineROI}}}

  Return the adjusted pCVR.
  `,
});

const adjustPCVRWithTargetROIFlow = ai.defineFlow(
  {
    name: 'adjustPCVRWithTargetROIFlow',
    inputSchema: AdjustPCVRWithTargetROIInputSchema,
    outputSchema: AdjustPCVRWithTargetROIOutputSchema,
  },
  async input => {
    let bias = 0;
    if (input.targetROI > input.baselineROI) {
      bias = 0.1; // Positive bias, increase pCVR by 10%
    } else if (input.targetROI < input.baselineROI) {
      bias = -0.1; // Negative bias, decrease pCVR by 10%
    }

    const adjustedPCVR = input.basePCVR * (1 + bias);

    return {adjustedPCVR};
  }
);
