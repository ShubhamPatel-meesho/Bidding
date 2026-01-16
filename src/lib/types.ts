

export type SimulationWindowResult = {
  name: string;
  targetROI: number;
  avgBid: number;
  totalClicks: number;
  totalOrders: number;
  totalSpend: number;
  totalRevenue: number;
  deliveredROI: number;
  avgPCVR: number;
  ordersToClicksRatio: number;
};

export type SimulationSummary = {
  totalClicks: number;
  totalOrders: number;
  totalSpend: number;
  totalRevenue: number;
  finalDeliveredROI: number;
  budget: number;
  budgetUtilisation: number;
  spentAllBudget: boolean;
};

export type SimulationResults = {
  windows: SimulationWindowResult[];
  summary: SimulationSummary;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  finalDeliveredROI: number;
  budgetUtilisation: number;
  totalOrders: number;
  roiTargets: number[];
  aov: number;
  budget: number;
  sellerRoi: number;
};

export type OptimizationIteration = {
  iteration: number;
  roiTargets: number[];
  budgetUtilization: number;
  deliveredROI: number;
  score: number;
  isBest: boolean;
};

export type MultiDaySimulationParams = {
  slRoi: number;
  initialTargetRoi: number;
  initialDeliveredRoi: number;
  dailyBudget: number;
  aov: number;
  basePCVR: number;
  overallError: number;
  dayVolatility: number;
  volatility: number;
  pacingP: number;
  pacingI: number;
  pacingD: number;
  bpP: number;
  numDays: number;
  nValue: number;
  kValue: number;
  bpKValue: number;
  modules: string[];
  upperProb: number;
  highProb: number;
  midProb: number;
  lowProb: number;
};

export type TimeIntervalResult = {
  timestamp: number;
  day: number;
  hour: number;
  label: string;
  targetROI: number;
  deliveredROI: number; // Catalog ROI
  dayROI: number;
  slRoi: number;
  clicks: number;
  orders: number;
  gmv: number;
  spend: number;
  avgBid: number;
  pCvr: number;
  dayCumulativeClicks: number;
  dayCumulativeGmv: number;
  dayCumulativeSpend: number;
  dayBudgetUtilisation: number;
  idealBudgetUtilisation: number;
  activeModule: 'RP' | 'BP' | 'None';
};

export type MultiDayLeaderboardEntry = MultiDaySimulationParams & {
  id: string;
  name: string;
  finalDeliveredROI: number;
  finalBudgetUtilisation: number;
  results: TimeIntervalResult[];
};
