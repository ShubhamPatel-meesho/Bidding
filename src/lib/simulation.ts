import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const AVG_AOV = 500; // ₹500
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00
const COMPETITOR_LOW_BID_THRESHOLD = 0.80; // ₹0.80
const LOW_CLICKS_PER_HOUR = 50;
const MEDIUM_CLICKS_PER_HOUR = 100;
const HIGH_CLICKS_PER_HOUR = 200;
const HOURS_PER_WINDOW = 6;

// --- Helper Functions ---
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Main Simulation Function ---
export async function runSimulation(roiTargets: number[]): Promise<SimulationResults | {error: string}> {
  const windowResults: SimulationWindowResult[] = [];
  
  const windowNames = ["0-6h", "6-12h", "12-18h", "18-24h"];
  let hasAIError = false;

  for (let i = 0; i < roiTargets.length; i++) {
    const targetROI = roiTargets[i];
    
    // 1. Get Contextual pCVR from AI
    const pCVRResponse = await getAdjustedPCVR(targetROI);
    let contextualPCVR = 0.01; // Base pCVR
    if ('error' in pCVRResponse) {
        hasAIError = true;
        console.warn(pCVRResponse.error);
    } else {
        contextualPCVR = pCVRResponse.adjustedPCVR;
    }

    // 2. pCVR Variation for simulation is now handled inside getAdjustedPCVR
    const simulatedPCVR = contextualPCVR;
    
    // 3. Calculate Bid
    // Target ROI is in %, so divide by 100
    const bid = simulatedPCVR * (AVG_AOV / (targetROI / 100));

    // 4. Simulate Clicks
    let clicksPerHour;
    if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
      clicksPerHour = LOW_CLICKS_PER_HOUR;
    } else if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
      clicksPerHour = HIGH_CLICKS_PER_HOUR;
    } else {
      clicksPerHour = MEDIUM_CLICKS_PER_HOUR;
    }
    const totalClicks = clicksPerHour * HOURS_PER_WINDOW;

    // 5. Simulate Orders
    const actualCVR = simulatedPCVR * randomInRange(0.8, 1.2);
    const totalOrders = totalClicks * actualCVR;

    // 6. Calculate Final Metrics for the window
    const totalSpend = totalClicks * bid;
    const totalRevenue = totalOrders * AVG_AOV;
    const deliveredROI = totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0;
    
    windowResults.push({
      name: windowNames[i],
      targetROI,
      avgBid: bid,
      totalClicks: Math.round(totalClicks),
      totalOrders: Math.round(totalOrders),
      totalSpend,
      totalRevenue,
      deliveredROI,
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

  const finalDeliveredROI = summary.totalSpend > 0 ? (summary.totalRevenue / summary.totalSpend) * 100 : 0;

  const results: SimulationResults = {
    windows: windowResults,
    summary: { ...summary, finalDeliveredROI },
  };
  
  if (hasAIError) {
      return { ...results, error: "An issue occurred during simulation. Simulation ran with base values." };
  }

  return results;
}
