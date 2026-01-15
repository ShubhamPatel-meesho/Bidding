

import { getAdjustedPCVR } from "@/app/actions";
import type { SimulationResults, SimulationWindowResult, MultiDaySimulationParams, TimeIntervalResult } from "./types";

// --- Core Input Parameters (Fixed Assumptions) ---
const COMPETITOR_HIGH_BID_THRESHOLD = 2.00; // ₹2.00 - Bids above this are highly competitive
const COMPETITOR_LOW_BID_THRESHOLD = 0.80;  // ₹0.80 - Bids below this are not competitive
const BID_THROTTLE_THRESHOLD = 0.04; // Below this bid, clicks are 0
const HIGH_CLICKS_PER_HOUR = 200; // Max potential clicks for a top bid at peak time
const HOURS_PER_WINDOW = 6;
const INTERVALS_PER_HOUR = 2; // 30-minute intervals

// This maps the hourly potential to each 30-minute interval within a day (48 intervals)
const clickPotentialByInterval = [
    0.31, 0.31, // 0h
    0.18, 0.18, // 1h
    0.09, 0.09, // 2h
    0.07, 0.07, // 3h
    0.10, 0.10, // 4h
    0.24, 0.24, // 5h
    0.41, 0.41, // 6h
    0.54, 0.54, // 7h
    0.66, 0.66, // 8h
    0.78, 0.78, // 9h
    0.83, 0.83, // 10h
    0.87, 0.87, // 11h
    0.97, 0.97, // 12h
    1.00, 1.00, // 13h
    0.98, 0.98, // 14h
    0.87, 0.87, // 15h
    0.87, 0.87, // 16h
    0.89, 0.89, // 17h
    0.85, 0.85, // 18h
    0.78, 0.78, // 19h
    0.70, 0.70, // 20h
    0.62, 0.62, // 21h
    0.45, 0.45, // 22h
    0.35, 0.35, // 23h
];

// Based on the budget utilization graph provided by the user.
const BU_IDEAL_PLAN = [
    0.00, 0.01, 0.01, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.04, 0.05,
    0.06, 0.08, 0.10, 0.13, 0.16, 0.19, 0.23, 0.27, 0.31, 0.35, 0.40, 0.45,
    0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.84, 0.88, 0.91, 0.94, 0.96,
    0.98, 0.99, 0.99, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00
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
    
    const hourForWindow = i * HOURS_PER_WINDOW;

    // 1. Get Contextual pCVR
    const pCVRResponse = await getAdjustedPCVR(targetROI, aov, hourForWindow, 0.015, 0); // Using defaults for single day sim
    let contextualPCVR: number;
    if ('error' in pCVRResponse) {
        hasError = true;
        console.warn(pCVRResponse.error);
        if(pCVRResponse.error) errorMessage = pCVRResponse.error;
        contextualPCVR = pCVRResponse.adjustedPCVR;
    } else {
        contextualPCVR = pCVRResponse.adjustedPCVR;
    }
    
    const bid = contextualPCVR * (aov / targetROI);

    // 4. Simulate Clicks
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
        
        const windowClickPotential = clickPotentialByInterval.slice(i * 12, (i+1) * 12).reduce((a,b) => a+b, 0) / 12;
        const maxWindowClicks = HIGH_CLICKS_PER_HOUR * windowClickPotential;
        const potentialClicksPerHour = maxWindowClicks * clickAttainmentFactor;
        const potentialWindowClicks = potentialClicksPerHour * HOURS_PER_WINDOW * randomInRange(0.95, 1.05);

        const affordableClicks = remainingBudget / bid;
        totalClicks = Math.min(potentialWindowClicks, affordableClicks);

        if (totalClicks >= affordableClicks && i < roiTargets.length -1) {
          spentAllBudget = true;
        }
    }

    const actualCVR = contextualPCVR * randomInRange(0.85, 1.15);
    const fractionalOrders = totalClicks * actualCVR;
    const totalOrders = Math.floor(fractionalOrders);

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
  const { slRoi, initialTargetRoi, pacingP, pacingI, pacingD, bpP, dailyBudget, numDays, initialDeliveredRoi, aov, nValue, kValue, bpKValue, basePCVR, calibrationError, modules } = params;

  let recentHistory: { spend: number, gmv: number, clicks: number, orders: number }[] = [];
  
  // --- WARM-UP PHASE ---
  if (initialDeliveredRoi > 0 && nValue > 0) {
    const initialPCVRResponse = await getAdjustedPCVR(initialTargetRoi, aov, 13, basePCVR, calibrationError); // Use peak time for initial guess
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
  
  let clicksSinceLastRpUpdate = 0;
  let clicksSinceLastBpUpdate = 0;
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
    
    const prevIntervalOfDay = (i > 0 && !isNewDay) ? lastIntervals[i-1] : null;

    const dailySpend = prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeSpend : 0;
    const remainingDailyBudget = dailyBudget - dailySpend;
    const dayBudgetUtilisation = dailyBudget > 0 ? dailySpend / dailyBudget : 0;
    const idealBudgetUtilisation = BU_IDEAL_PLAN[intervalIndexInDay];


    // --- Pacing Logic ---
    let potentialRpTargetRoi: number | null = null;
    let potentialBpTargetRoi: number | null = null;
    
    // --- ROI Pacing (RP) Target Calculation ---
    if (clicksSinceLastRpUpdate >= kValue && recentHistory.length > 0) {
      const error = (slRoi - deliveredRoi) / slRoi;
      integralError += error;
      const derivativeError = error - previousError;
      
      const adjustment = (pacingP * error) + (pacingI * integralError) + (pacingD * derivativeError);
      potentialRpTargetRoi = currentTargetRoi * (1 + adjustment);
      
      previousError = error;
      clicksSinceLastRpUpdate = 0; // Will be reset after potential application
    }

    // --- Budget Pacing (BP) Target Calculation ---
    if (clicksSinceLastBpUpdate >= bpKValue) {
        const bpError = dayBudgetUtilisation - idealBudgetUtilisation; // positive means overspending
        const bpAdjustment = bpP * bpError;
        potentialBpTargetRoi = currentTargetRoi + bpAdjustment;
        clicksSinceLastBpUpdate = 0; // Will be reset after potential application
    }
    
    // --- Module Selection & Target Application Logic ---
    const useRP = modules.includes('rp');
    const useBP = modules.includes('bp');
    let activeModule: 'RP' | 'BP' | 'None' = 'None';
    
    if (useRP && !useBP) {
        activeModule = 'RP';
    } else if (!useRP && useBP) {
        activeModule = 'BP';
    } else if (useRP && useBP) {
        if (deliveredRoi <= slRoi) {
            activeModule = 'RP';
        } else if (dayBudgetUtilisation > idealBudgetUtilisation) { // Overspending
            activeModule = 'BP';
        } else { // Underspending and ROI is fine
            activeModule = 'RP';
        }
    }

    // Apply the update only if the correct module is active at the time of update
    if (activeModule === 'RP' && potentialRpTargetRoi !== null) {
        currentTargetRoi = potentialRpTargetRoi;
    } else if (activeModule === 'BP' && potentialBpTargetRoi !== null) {
        currentTargetRoi = potentialBpTargetRoi;
    }

    // Reset counters if their update was calculated but not applied
    if (potentialRpTargetRoi !== null && activeModule !== 'RP') {
        clicksSinceLastRpUpdate = 0;
    }
     if (potentialBpTargetRoi !== null && activeModule !== 'BP') {
        clicksSinceLastBpUpdate = 0;
    }


    // --- Core Bid & Click Simulation for Interval ---
    const intervalPCVRResponse = await getAdjustedPCVR(currentTargetRoi, aov, hour, basePCVR, calibrationError);
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
    
    // Update continuous click counters
    clicksSinceLastRpUpdate += clicks;
    clicksSinceLastBpUpdate += clicks;
    
    const actualCVR = pCvr * randomInRange(0.9, 1.1);
    const fractionalOrders = clicks * actualCVR + orderCarryOver;
    const orders = Math.floor(fractionalOrders);
    orderCarryOver = fractionalOrders - orders;
    const gmv = orders * aov;
    
    if (clicks > 0) {
      recentHistory.push({ spend, gmv, clicks, orders });
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
    
    const finalDayCumulativeSpend = dailySpend + spend;
    const finalDayCumulativeGmv = (prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeGmv : 0) + gmv;
    const dayROI = finalDayCumulativeSpend > 0 ? finalDayCumulativeGmv / finalDayCumulativeSpend : 0;
    
    const finalDayCumulativeClicks = (prevIntervalOfDay ? prevIntervalOfDay.dayCumulativeClicks : 0) + clicks;
    const finalDayBudgetUtilisation = dailyBudget > 0 ? finalDayCumulativeSpend / dailyBudget : 0;
    
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
      dayCumulativeClicks: finalDayCumulativeClicks,
      dayCumulativeGmv: finalDayCumulativeGmv,
      dayCumulativeSpend: finalDayCumulativeSpend,
      dayBudgetUtilisation: finalDayBudgetUtilisation,
      idealBudgetUtilisation: idealBudgetUtilisation,
      activeModule: activeModule,
    };
    lastIntervals[i] = result;
    if (i < totalIntervals) {
      yield result;
    }
  }
}
    
