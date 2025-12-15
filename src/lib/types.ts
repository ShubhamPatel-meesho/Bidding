export type SimulationWindowResult = {
  name: string;
  targetROI: number;
  avgBid: number;
  totalClicks: number;
  totalOrders: number;
  totalSpend: number;
  totalRevenue: number;
  deliveredROI: number;
};

export type SimulationSummary = {
  totalClicks: number;
  totalOrders: number;
  totalSpend: number;
  totalRevenue: number;
  finalDeliveredROI: number;
};

export type SimulationResults = {
  windows: SimulationWindowResult[];
  summary: SimulationSummary;
};
