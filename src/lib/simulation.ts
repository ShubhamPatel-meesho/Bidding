import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult, MultiDaySimulationParams, TimeIntervalResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00 - Bids above this are highly competitive
const COMPETITOR_LOW_BID_THRESHOLD = 0.80;  // ₹0.80 - Bids below this are not competitive
const BID_THROTTLE_THRESHOLD = 0.04; // Below this bid, clicks are 0
const HIGH_CLICKS_PER_HOUR = 200; // Max potential clicks for a top bid at peak time
const HOURS_PER_WINDOW = 6;
const INTERVALS_PER_HOUR = 2; // 30-minute intervals

// --- Time-based click potential based on the provided chart ---
// This is now per 30-minute interval
const clickPotentialByInterval = [
  // 0-6h (12 intervals)
  0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4,
  // 6-12h (12 intervals)
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  // 12-18h (12 intervals)
  0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
  // 18-24h (12 intervals)
  0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7
];


// --- Helper Functions ---
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Main Simulation Function ---
export async function runSimulation(roiTargets: number[], aov: number, budget: number): Promise<SimulationResults | {error: string, windows: SimulationWindowResult[], summary: any}> {
  const windowResults: SimulationWindowResult[] = [];
  
  const windowNames = ["0-6h", "6-12h", "12-18h", "18-24h"];
  let hasError = false;
  let errorMessage = "An issue occurred during simulation. Simulation ran with base values.";
  let remainingBudget = budget;
  let spentAllBudget = false;

  for (let i = 0; i < roiTargets.length; i++) {
    const targetROI = roiTargets[i];
    
    // 1. Get Contextual pCVR based on Target ROI, AOV, and the time window
    const pCVRResponse = await getAdjustedPCVR(targetROI, aov, i);
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

    // 4. Simulate Clicks with improved logic, considering budget and bid throttle
    let totalClicks = 0;
    if (remainingBudget > 0 && bid >= BID_THROTTLE_THRESHOLD) {
        let clickAttainmentFactor;
        
        // This logic creates a non-linear curve for click attainment.
        if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
            // Lower-end bids (from throttle to low_threshold) - sharp penalty for being uncompetitive
            const position = (bid - BID_THROTTLE_THRESHOLD) / (COMPETITOR_LOW_BID_THRESHOLD - BID_THROTTLE_THRESHOLD);
            clickAttainmentFactor = Math.pow(position, 2) * 0.5; // Starts at 0, curves up to 50%
        } else if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
            // Bids above the high threshold get max clicks
            clickAttainmentFactor = 1.0; 
        } else {
            // Competitive range (between low and high thresholds) - linear scaling
            const bidRange = COMPETITOR_HIGH_BID_THRESHOLD - COMPETITOR_LOW_BID_THRESHOLD;
            const bidPosition = (bid - COMPETITOR_LOW_BID_THRESHOLD) / bidRange;
            clickAttainmentFactor = 0.5 + bidPosition * 0.5; // Ramps from 50% to 100%
        }
        
        // Max possible clicks in this window is HIGH_CLICKS_PER_HOUR adjusted for time of day
        const maxWindowClicks = HIGH_CLICKS_PER_HOUR * clickPotentialByWindow[i];
        const potentialClicksPerHour = maxWindowClicks * clickAttainmentFactor;
        const potentialWindowClicks = potentialClicksPerHour * HOURS_PER_WINDOW * randomInRange(0.95, 1.05);

        // Determine clicks based on budget
        const affordableClicks = remainingBudget / bid;
        totalClicks = Math.min(potentialWindowClicks, affordableClicks);

        if (totalClicks >= affordableClicks && i < roiTargets.length -1) {
          spentAllBudget = true;
        }

    }


    // 5. Simulate Orders
    const actualCVR = simulatedPCVR * randomInRange(0.85, 1.15); // Tighter randomness
    const fractionalOrders = totalClicks * actualCVR;
    const totalOrders = Math.floor(fractionalOrders);

    // 6. Calculate Final Metrics for the window
    const totalSpend = totalClicks * bid;
    remainingBudget -= totalSpend; // Decrease remaining budget
    if(remainingBudget < 0) remainingBudget = 0;

    const totalRevenue = totalOrders * aov;
    const deliveredROI = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
    
    windowResults.push({
      name: windowNames[i],
      targetROI,
      avgBid: bid,
      totalClicks: Math.round(totalClicks),
      totalOrders: totalOrders,
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
  const budgetUtilisation = budget > 0 ? (summary.totalSpend / budget) : 0;

  const results: SimulationResults = {
    windows: windowResults,
    summary: { ...summary, finalDeliveredROI, budgetUtilisation, budget, spentAllBudget },
  };
  
  if (hasError) {
      return { ...results, error: errorMessage };
  }

  return results;
}


// --- New Multi-Day Simulator ---
const CLICKS_FOR_ROI_CALC = 3000;
const CLICKS_FOR_ROI_UPDATE = 600;

export async function runMultiDaySimulation(params: MultiDaySimulationParams): Promise<TimeIntervalResult[]> {
  const { slRoi, initialTargetRoi, pacingP, dailyBudget, numDays } = params;

  let timeSeries: TimeIntervalResult[] = [];
  let recentHistory: { spend: number, gmv: number }[] = [];
  let clicksSinceLastUpdate = 0;
  let currentTargetRoi = initialTargetRoi;
  let deliveredRoi = params.initialDeliveredRoi; 

  const totalIntervals = numDays * 24 * INTERVALS_PER_HOUR;
  const aov = 300; // Assuming a fixed AOV for now

  for (let i = 0; i < totalIntervals; i++) {
    const day = Math.floor(i / (24 * INTERVALS_PER_HOUR)) + 1;
    const hour = Math.floor((i % (24 * INTERVALS_PER_HOUR)) / INTERVALS_PER_HOUR);
    const intervalIndexInDay = i % (24 * INTERVALS_PER_HOUR);
    
    const dayData = timeSeries.filter(d => d.day === day);
    const dailySpend = dayData.reduce((sum, d) => sum + d.spend, 0);
    const remainingDailyBudget = dailyBudget - dailySpend;

    // --- PID Controller Logic ---
    if (clicksSinceLastUpdate >= CLICKS_FOR_ROI_UPDATE) {
      const error = (slRoi - deliveredRoi) / deliveredRoi;
      const adjustment = 1 + (pacingP * error);
      currentTargetRoi = currentTargetRoi * adjustment;
      clicksSinceLastUpdate = 0; // Reset counter
    }

    // --- Core Bid & Click Simulation for Interval ---
    const intervalPCVRResponse = await getAdjustedPCVR(currentTargetRoi, aov, Math.floor(intervalIndexInDay / (HOURS_PER_WINDOW * INTERVALS_PER_HOUR)));
    const pCvr = intervalPCVRResponse.adjustedPCVR;
    const bid = pCvr * (aov / currentTargetRoi);
    
    const clickPotential = clickPotentialByInterval[intervalIndexInDay] / INTERVALS_PER_HOUR;
    const maxIntervalClicks = HIGH_CLICKS_PER_HOUR * clickPotential * randomInRange(0.9, 1.1);

    const affordableClicks = (bid > 0) ? remainingDailyBudget / bid : 0;
    const clicks = Math.max(0, Math.min(maxIntervalClicks, affordableClicks));

    const spend = clicks * bid;
    const orders = Math.floor(clicks * pCvr * randomInRange(0.9, 1.1));
    const gmv = orders * aov;
    
    // --- Update history for Delivered ROI calculation ---
    if (clicks > 0) {
      recentHistory.push({ spend, gmv });
    }
    while(recentHistory.reduce((sum, h) => sum + h.spend, 0) > CLICKS_FOR_ROI_CALC * bid) { // Approx. last 3k clicks
        if(recentHistory.length <= 1) break;
        recentHistory.shift();
    }
    const totalHistorySpend = recentHistory.reduce((s, h) => s + h.spend, 0);
    const totalHistoryGmv = recentHistory.reduce((s, h) => s + h.gmv, 0);

    if (totalHistorySpend > 0) {
        deliveredRoi = totalHistoryGmv / totalHistorySpend;
    }
    
    clicksSinceLastUpdate += clicks;

    const dayROI = (dailySpend + spend > 0) ? (dayData.reduce((s, d) => s + d.gmv, 0) + gmv) / (dailySpend + spend) : 0;
    
    timeSeries.push({
      timestamp: i,
      day: day,
      hour: hour,
      label: `D${day} H${hour}`,
      targetROI: currentTargetRoi,
      deliveredROI: deliveredRoi, // Catalog ROI
      dayROI: dayROI,
      slRoi: slRoi,
      clicks: clicks,
      gmv: gmv,
      spend: spend,
    });
  }

  return timeSeries;
}
