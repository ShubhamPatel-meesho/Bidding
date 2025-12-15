import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00 - Bids above this are highly competitive
const COMPETITOR_LOW_BID_THRESHOLD = 0.80;  // ₹0.80 - Bids below this are not competitive
const LOW_CLICKS_PER_HOUR = 80;
const MEDIUM_CLICKS_PER_HOUR = 120;
const HIGH_CLICKS_PER_HOUR = 200; // Max potential clicks for a top bid at peak time
const HOURS_PER_WINDOW = 6;

// --- Time-based click potential based on the provided chart ---
const clickPotentialByWindow = [
  0.4, // 0-6h: Lower traffic
  1.0, // 6-12h: Ramping up to peak
  0.9, // 12-18h: High traffic, slight dip
  0.7, // 18-24h: Dropping off,
];

// --- Helper Functions ---
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Main Simulation Function ---
export async function runSimulation(roiTargets: number[], aov: number): Promise<SimulationResults | {error: string, windows: SimulationWindowResult[], summary: any}> {
  const windowResults: SimulationWindowResult[] = [];
  
  const windowNames = ["0-6h", "6-12h", "12-18h", "18-24h"];
  let hasError = false;
  let errorMessage = "An issue occurred during simulation. Simulation ran with base values.";

  for (let i = 0; i < roiTargets.length; i++) {
    const targetROI = roiTargets[i];
    
    // 1. Get Contextual pCVR based on Target ROI and AOV
    const pCVRResponse = await getAdjustedPCVR(targetROI, aov);
    let contextualPCVR: number;
    if ('error' in pCVRResponse) {
        hasError = true;
        console.warn(pCVRResponse.error);
        if(pCVRResponse.error) errorMessage = pCVRResponse.error;
        contextualPCVR = pCVRResponse.adjustedPCVR;
    } else {
        contextualPCVR = pCVRResponse.adjustedPCVR;
    }

    // 2. pCVR is now determined by the server action
    const simulatedPCVR = contextualPCVR;
    
    // 3. Calculate Bid based on target ROI
    const bid = simulatedPCVR * (aov / targetROI);

    // 4. Simulate Clicks with improved logic
    let clickAttainmentFactor;
    if (bid <= 0.1) { // Very low, non-competitive bids
        clickAttainmentFactor = 0.05; // Gets only 5% of potential clicks
    } else if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
        // Rapidly ramps up from the floor
        const bidPosition = (bid - 0.1) / (COMPETITOR_LOW_BID_THRESHOLD - 0.1);
        clickAttainmentFactor = 0.05 + bidPosition * 0.45; // Ramps from 5% to 50%
    } else if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
        clickAttainmentFactor = 1.0; // Max clicks
    } else {
        // Linear scaling in the competitive range
        const bidRange = COMPETITOR_HIGH_BID_THRESHOLD - COMPETITOR_LOW_BID_THRESHOLD;
        const bidPosition = (bid - COMPETITOR_LOW_BID_THRESHOLD) / bidRange;
        clickAttainmentFactor = 0.5 + bidPosition * 0.5; // Ramps from 50% to 100%
    }
    
    // Max possible clicks in this window is HIGH_CLICKS_PER_HOUR adjusted for time of day
    const maxWindowClicks = HIGH_CLICKS_PER_HOUR * clickPotentialByWindow[i];
    const clicksPerHour = maxWindowClicks * clickAttainmentFactor;
    const totalClicks = clicksPerHour * HOURS_PER_WINDOW * randomInRange(0.95, 1.05);

    // 5. Simulate Orders
    const actualCVR = simulatedPCVR * randomInRange(0.85, 1.15); // Tighter randomness
    const totalOrders = totalClicks * actualCVR;

    // 6. Calculate Final Metrics for the window
    const totalSpend = totalClicks * bid;
    const totalRevenue = totalOrders * aov;
    const deliveredROI = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
    
    windowResults.push({
      name: windowNames[i],
      targetROI,
      avgBid: bid,
      totalClicks: Math.round(totalClicks),
      totalOrders: Math.round(totalOrders),
      totalSpend,
      totalRevenue,
      deliveredROI,
      avgPCVR: contextualPCVR,
      ordersToClicksRatio: totalClicks > 0 ? (totalOrders / totalClicks) : 0,
    });
  }

  // Calculate 24-hour summary
  const summary = windowResults.reduce((acc, window) => {
    acc.totalClicks += window.totalClicks;
    acc.totalOrders += window.totalOrders;
    acc.totalSpend += window.totalSpend;
    acc.totalRevenue += window.totalRevenue;
    return acc;
  }, { totalClicks: 0, totalOrders: 0, totalSpend: 0, totalRevenue: 0 });

  const finalDeliveredROI = summary.totalSpend > 0 ? (summary.totalRevenue / summary.totalSpend) : 0;

  const results: SimulationResults = {
    windows: windowResults,
    summary: { ...summary, finalDeliveredROI },
  };
  
  if (hasError) {
      return { ...results, error: errorMessage };
  }

  return results;
}
