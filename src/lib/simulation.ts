

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
    const pCVRResponse = await getAdjustedPCVR(targetROI, aov, i, 0.015, 0); // Using defaults for single day sim
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
export async function* runMultiDaySimulation(
    params: MultiDaySimulationParams
): AsyncGenerator<TimeIntervalResult | undefined, void, undefined> {
  const { slRoi, initialTargetRoi, pacingP, pacingI, pacingD, dailyBudget, numDays, initialDeliveredRoi, aov, nValue, kValue, basePCVR, calibrationError } = params;

  let recentHistory: { spend: number, gmv: number, clicks: number, orders: number }[] = [];
  
  // --- WARM-UP PHASE ---
  // Pre-populate history to achieve the initialDeliveredRoi
  if (initialDeliveredRoi > 0 && nValue > 0) {
    const initialPCVRResponse = await getAdjustedPCVR(initialTargetRoi, aov, 1, basePCVR, calibrationError); // Use peak time for initial guess
    const initialPCVR = initialPCVRResponse.adjustedPCVR;
    const initialBid = initialPCVR * (aov / initialTargetRoi);
    const warmupSpend = nValue * initialBid;
    const warmupGmv = warmupSpend * initialDeliveredRoi;
    const warmupOrders = Math.floor(warmupGmv / aov);
    recentHistory.push({
      spend: warmupSpend,
      gmv: warmupGmv,
      clicks: nValue,
      orders: warmupOrders,
    });
  }
  
  let clicksSinceLastUpdate = 0;
  let currentTargetRoi = initialTargetRoi;
  let deliveredRoi = initialDeliveredRoi; 
  let integralError = 0;
  let previousError = 0;
  let orderCarryOver = 0;

  const totalIntervals = numDays * 24 * INTERVALS_PER_HOUR;
  
  let lastIntervals: {[key: number]: TimeIntervalResult} = {};

  for (let i = 0; i < totalIntervals; i++) {
    const day = Math.floor(i / (24 * INTERVALS_PER_HOUR)) + 1;
    const hour = Math.floor((i % (24 * INTERVALS_PER_HOUR)) / INTERVALS_PER_HOUR);
    const intervalIndexInDay = i % (24 * INTERVALS_PER_HOUR);

    const isNewDay = intervalIndexInDay === 0;
    
    // Get cumulative data from the PREVIOUS interval of the SAME day
    const prevIntervalOfDay = (i > 0 && !isNewDay) ? lastIntervals[i-1] : null;

    const dailySpend = prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeSpend : 0;
    const remainingDailyBudget = dailyBudget - dailySpend;

    // --- PID Controller Logic ---
    if (clicksSinceLastUpdate >= kValue && recentHistory.length > 0) {
      const error = (slRoi - deliveredRoi) / slRoi;
      integralError += error;
      const derivativeError = error - previousError;
      
      const adjustment = (pacingP * error) + (pacingI * integralError) + (pacingD * derivativeError);
      currentTargetRoi = currentTargetRoi * (1 + adjustment);
      
      previousError = error;
      clicksSinceLastUpdate = 0;
    }

    // --- Core Bid & Click Simulation for Interval ---
    const windowIndex = Math.floor(hour / HOURS_PER_WINDOW);
    const intervalPCVRResponse = await getAdjustedPCVR(currentTargetRoi, aov, windowIndex, basePCVR, calibrationError);
    const pCvr = intervalPCVRResponse.adjustedPCVR;
    const bid = pCvr * (aov / currentTargetRoi);
    
    let clickAttainmentFactor = 0;
    if (bid >= BID_THROTTLE_THRESHOLD && remainingDailyBudget > 0) {
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
    const clicks = Math.floor(Math.max(0, Math.min(maxIntervalClicks, affordableClicks)));
    const spend = clicks * bid;
    
    const actualCVR = pCvr * randomInRange(0.9, 1.1);
    const fractionalOrders = clicks * actualCVR + orderCarryOver;
    const orders = Math.floor(fractionalOrders);
    orderCarryOver = fractionalOrders - orders;
    const gmv = orders * aov;
    
    if (clicks > 0) {
      recentHistory.push({ spend, gmv, clicks, orders });
      clicksSinceLastUpdate += clicks;
    }

    let rollingClicks = 0;
    let historyToKeep: { spend: number; gmv: number; clicks: number, orders: number }[] = [];
    for(let j = recentHistory.length - 1; j >= 0; j--) {
        const hist = recentHistory[j];
        if (rollingClicks + hist.clicks <= nValue) {
            rollingClicks += hist.clicks;
            historyToKeep.unshift(hist);
        } else {
            const fractionToKeep = (nValue - rollingClicks) / hist.clicks;
            historyToKeep.unshift({
                spend: hist.spend * fractionToKeep,
                gmv: hist.gmv * fractionToKeep,
                clicks: hist.clicks * fractionToKeep,
                orders: Math.floor(hist.orders * fractionToKeep),
            });
            rollingClicks = nValue;
            break;
        }
    }
    recentHistory = historyToKeep;

    const totalHistorySpend = recentHistory.reduce((s, h) => s + h.spend, 0);
    const totalHistoryGmv = recentHistory.reduce((s, h) => s + h.gmv, 0);

    if (totalHistorySpend > 0) {
        deliveredRoi = totalHistoryGmv / totalHistorySpend;
    }
    
    const dayCumulativeSpend = dailySpend + spend;
    const dayCumulativeGmv = (prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeGmv : 0) + gmv;
    const dayROI = dayCumulativeSpend > 0 ? dayCumulativeGmv / dayCumulativeSpend : 0;
    
    const dayCumulativeClicks = (prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeClicks : 0) + clicks;
    const dayBudgetUtilisation = dailyBudget > 0 ? dayCumulativeSpend / dailyBudget : 0;
    
    const result: TimeIntervalResult = {
      timestamp: i,
      day: day,
      hour: hour,
      label: `D${day} H${hour}`,
      targetROI: currentTargetRoi,
      deliveredROI: deliveredRoi,
      dayROI: dayROI,
      slRoi: slRoi,
      clicks: clicks,
      orders: orders,
      gmv: gmv,
      spend: spend,
      avgBid: bid,
      pCvr: pCvr,
      dayCumulativeClicks: dayCumulativeClicks,
      dayCumulativeGmv: dayCumulativeGmv,
      dayCumulativeSpend: dayCumulativeSpend,
      dayBudgetUtilisation: dayBudgetUtilisation,
    };
    lastIntervals[i] = result;
    yield result;
  }
  // yield undefined;
}
    