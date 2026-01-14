import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult, MultiDaySimulationParams, TimeIntervalResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00 - Bids above this are highly competitive
const COMPETITOR_LOW_BID_THRESHOLD = 0.80;  // ₹0.80 - Bids below this are not competitive
const BID_THROTTLE_THRESHOLD = 0.04; // Below this bid, clicks are 0
const HIGH_CLICKS_PER_HOUR = 200; // Max potential clicks for a top bid at peak time
const HOURS_PER_WINDOW = 6;
const INTERVALS_PER_HOUR = 2; // 30-minute intervals

// --- Time-based click potential (per window) ---
const clickPotentialByWindow = [0.4, 1.0, 0.9, 0.7]; // Corresponds to 0-6h, 6-12h, 12-18h, 18-24h

// --- Time-based click potential based on the provided chart ---
// This is now per 30-minute interval within a day (48 intervals)
const clickPotentialByInterval = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / INTERVALS_PER_HOUR);
    if (hour < 6) return 0.4;
    if (hour < 12) return 1.0;
    if (hour < 18) return 0.9;
    return 0.7;
});


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
        
        if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
            const position = (bid - BID_THROTTLE_THRESHOLD) / (COMPETITOR_LOW_BID_THRESHOLD - BID_THROTTLE_THRESHOLD);
            clickAttainmentFactor = Math.pow(position, 2) * 0.5;
        } else if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
            clickAttainmentFactor = 1.0; 
        } else {
            const bidRange = COMPETITOR_HIGH_BID_THRESHOLD - COMPETITOR_LOW_BID_THRESHOLD;
            const bidPosition = (bid - COMPETITOR_LOW_BID_THRESHOLD) / bidRange;
            clickAttainmentFactor = 0.5 + bidPosition * 0.5;
        }
        
        const maxWindowClicks = HIGH_CLICKS_PER_HOUR * clickPotentialByWindow[i];
        const potentialClicksPerHour = maxWindowClicks * clickAttainmentFactor;
        const potentialWindowClicks = potentialClicksPerHour * HOURS_PER_WINDOW * randomInRange(0.95, 1.05);

        const affordableClicks = remainingBudget / bid;
        totalClicks = Math.min(potentialWindowClicks, affordableClicks);

        if (totalClicks >= affordableClicks && i < roiTargets.length -1) {
          spentAllBudget = true;
        }
    }

    // 5. Simulate Orders
    const actualCVR = simulatedPCVR * randomInRange(0.85, 1.15);
    const fractionalOrders = totalClicks * actualCVR;
    const totalOrders = Math.floor(fractionalOrders);

    // 6. Calculate Final Metrics for the window
    const totalSpend = totalClicks * bid;
    remainingBudget -= totalSpend;
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
  const { slRoi, initialTargetRoi, pacingP, dailyBudget, numDays, initialDeliveredRoi } = params;

  let timeSeries: TimeIntervalResult[] = [];
  let recentHistory: { spend: number, gmv: number, clicks: number }[] = [];
  let clicksSinceLastUpdate = 0;
  let currentTargetRoi = initialTargetRoi;
  let deliveredRoi = initialDeliveredRoi; 

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
    const windowIndex = Math.floor(hour / HOURS_PER_WINDOW);
    const intervalPCVRResponse = await getAdjustedPCVR(currentTargetRoi, aov, windowIndex);
    const pCvr = intervalPCVRResponse.adjustedPCVR;
    const bid = pCvr * (aov / currentTargetRoi);
    
    let clickAttainmentFactor = 0;
    if (bid >= BID_THROTTLE_THRESHOLD) {
       if (bid < COMPETITOR_LOW_BID_THRESHOLD) {
            const position = (bid - BID_THROTTLE_THRESHOLD) / (COMPETITOR_LOW_BID_THRESHOLD - BID_THROTTLE_THRESHOLD);
            clickAttainmentFactor = Math.pow(position, 2) * 0.5;
        } else if (bid > COMPETITOR_HIGH_BID_THRESHOLD) {
            clickAttainmentFactor = 1.0; 
        } else {
            const bidRange = COMPETITOR_HIGH_BID_THRESHOLD - COMPETITOR_LOW_BID_THRESHOLD;
            const bidPosition = (bid - COMPETITOR_LOW_BID_THRESHOLD) / bidRange;
            clickAttainmentFactor = 0.5 + bidPosition * 0.5;
        }
    }
    
    const clickPotential = clickPotentialByInterval[intervalIndexInDay] / INTERVALS_PER_HOUR;
    const maxIntervalClicks = HIGH_CLICKS_PER_HOUR * clickPotential * randomInRange(0.9, 1.1) * clickAttainmentFactor;

    const affordableClicks = (bid > 0) ? remainingDailyBudget / bid : 0;
    const clicks = Math.max(0, Math.min(maxIntervalClicks, affordableClicks));

    const spend = clicks * bid;
    const orders = Math.floor(clicks * pCvr * randomInRange(0.9, 1.1));
    const gmv = orders * aov;
    
    // --- Update history for Delivered ROI calculation ---
    if (clicks > 0) {
      recentHistory.push({ spend, gmv, clicks });
    }

    let rollingClicks = 0;
    let historyToKeep: { spend: number; gmv: number; clicks: number }[] = [];
    for(let j = recentHistory.length - 1; j >= 0; j--) {
        const hist = recentHistory[j];
        if (rollingClicks + hist.clicks <= CLICKS_FOR_ROI_CALC) {
            rollingClicks += hist.clicks;
            historyToKeep.unshift(hist);
        } else {
            const fractionToKeep = (CLICKS_FOR_ROI_CALC - rollingClicks) / hist.clicks;
            historyToKeep.unshift({
                spend: hist.spend * fractionToKeep,
                gmv: hist.gmv * fractionToKeep,
                clicks: hist.clicks * fractionToKeep,
            });
            rollingClicks = CLICKS_FOR_ROI_CALC;
            break;
        }
    }
    recentHistory = historyToKeep;

    const totalHistorySpend = recentHistory.reduce((s, h) => s + h.spend, 0);
    const totalHistoryGmv = recentHistory.reduce((s, h) => s + h.gmv, 0);

    if (totalHistorySpend > 0) {
        deliveredRoi = totalHistoryGmv / totalHistorySpend;
    }
    
    clicksSinceLastUpdate += clicks;

    const dayGmv = dayData.reduce((s, d) => s + d.gmv, 0) + gmv;
    const daySpend = dailySpend + spend;
    const dayROI = daySpend > 0 ? dayGmv / daySpend : 0;
    
    timeSeries.push({
      timestamp: intervalIndexInDay,
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
