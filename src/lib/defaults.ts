

export const MULTI_DAY_SIMULATOR_DEFAULTS = {
  name: `PID Strategy`,
  slRoi: 10,
  initialTargetRoi: 15,
  initialDeliveredRoi: 20,
  dailyBudget: 300,
  aov: 300,
  basePCVR: 1, // Given as a percentage
  overallError: -40, // Given as a percentage
  dayVolatility: 40, // Given as a percentage
  volatility: 30, // Given as a percentage
  pacingP: 0.2,
  pacingI: 0,
  pacingD: 0,
  bpP: 20,
  nValue: 3000,
  kValue: 600,
  bpKValue: 75,
  numDays: 3,
  modules: ['rp', 'bp'],
  upperProb: 99,
  highProb: 90,
  midProb: 50,
  lowProb: 10,
};

// --- New Bidding Probability Constants ---
export const BID_PROBABILITY = {
  UPPER_BID: 2.00,
  UPPER_PROB: 0.99,
  HIGH_BID: 1.00,
  HIGH_PROB: 0.90,
  MID_BID: 0.15,
  MID_PROB: 0.05,
  LOW_BID: 0.04,
  LOW_PROB: 0.01,
  THROTTLE_BID: 0.04,
};
