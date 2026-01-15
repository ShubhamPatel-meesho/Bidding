
export const MULTI_DAY_SIMULATOR_DEFAULTS = {
  name: `PID Strategy`,
  slRoi: 10,
  initialTargetRoi: 15,
  initialDeliveredRoi: 20,
  dailyBudget: 300,
  aov: 300,
  basePCVR: 1, // Given as a percentage
  calibrationError: 20, // Given as a percentage
  pacingP: 0.2,
  pacingI: 0,
  pacingD: 0,
  bpP: 10,
  nValue: 3000,
  kValue: 600,
  bpKValue: 75,
  numDays: 3,
  modules: ['rp', 'bp'],
};
