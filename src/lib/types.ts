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

export type OptimizationIteration = {
  iteration: number;
  roiTargets: number[];
  budgetUtilization: number;
  deliveredROI: number;
  score: number;
  isBest: boolean;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  finalDeliveredROI: number;
  budgetUtilisation: number;
  roiTargets: number[];
};
