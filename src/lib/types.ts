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
