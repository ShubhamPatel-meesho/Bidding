import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00
const COMPETITOR_LOW_BID_THRESHOLD = 0.80; // ₹0.80
const LOW_CLICKS_PER_HOUR = 80; // Based on chart, early morning
const MEDIUM_CLICKS_PER_HOUR = 120; // Based on chart, evening
const HIGH_CLICKS_PER_HOUR = 200; // Based on chart, daytime peak
const HOURS_PER_WINDOW = 6;

// --- Time-based click potential based on the provided chart ---
// Approximating the trend from the chart for each 6-hour window
const clickPotentialByWindow = [
  0.4, // 0-6h: Lower traffic
  1.0, // 6-12h: Ramping up to peak
  0.9, // 12-18h: High traffic, slight dip
  0.7, // 18-24h: Dropping off
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

    // 2. pCVR Variation for simulation is now handled inside getAdjustedPCVR
    const simulatedPCVR = contextualPCVR;
    
    // 3. Calculate Bid
    // Target ROI is a multiplier
    const bid = simulatedPCVR * (aov / targetROI);

    // 4. Simulate Clicks based on bid, competition, and time of day potential
    let baseClicksPerHour;
    if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
        baseClicksPerHour = HIGH_CLICKS_PER_HOUR;
    } else if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
        baseClicksPerHour = LOW_CLICKS_PER_HOUR;
    } else {
        // Linear interpolation for bids between the low and high thresholds
        const bidRange = COMPETITOR_HIGH_BID_THRESHOLD - COMPETITOR_LOW_BID_THRESHOLD;
        const clickRange = HIGH_CLICKS_PER_HOUR - LOW_CLICKS_PER_HOUR;
        const bidPosition = (bid - COMPETITOR_LOW_BID_THRESHOLD) / bidRange;
        baseClicksPerHour = LOW_CLICKS_PER_HOUR + (bidPosition * clickRange);
    }
    
    // Adjust clicks based on the time window's potential
    const clicksPerHour = baseClicksPerHour * clickPotentialByWindow[i];
    const totalClicks = clicksPerHour * HOURS_PER_WINDOW * randomInRange(0.9, 1.1);


    // 5. Simulate Orders
    const actualCVR = simulatedPCVR * randomInRange(0.8, 1.2);
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
