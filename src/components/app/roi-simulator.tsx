"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { runSimulation } from '@/lib/simulation';
import type { OptimizationIteration, SimulationResults, SimulationSummary } from '@/lib/types';
import ROIInputForm, { formSchema, type ROIFormValues } from './roi-input-form';
import ResultsTable from './results-table';
import SummaryCard from './summary-card';
import OptimizationLog from './optimization-log';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Clock, Droplets, Info, IndianRupee, BrainCircuit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"


async function findOptimalROIs(
  getValues: () => ROIFormValues,
  runSim: typeof runSimulation,
  onIteration: (iteration: OptimizationIteration) => void
): Promise<number[]> {
  const { aov, budget } = getValues();
  let bestROIs = [getValues().roi1, getValues().roi2, getValues().roi3, getValues().roi4];
  let bestScore = -1;
  let bestResult: SimulationSummary | null = null;

  // This is a simple iterative search. It's not guaranteed to be the absolute "best" but will be fast.
  const iterations = 30;
  const step = 0.5; // How much to adjust ROI by each time

  for (let i = 0; i < iterations; i++) {
    const currentROIs = i === 0 ? bestROIs : bestROIs.map(r => {
        // On later iterations, randomly nudge the ROI targets to explore
        const adjustment = (Math.random() - 0.5) * step * 5; // bigger random jump
        return Math.max(1, r + adjustment);
    });

    const result = await runSim(currentROIs, aov, budget);
    const summary = result.summary;

    // Scoring function: Prefers high ROI and ~95-100% budget utilization.
    // Penalize heavily for overspending or significant underspending.
    // **NEW**: Heavily penalize if budget is spent before the last window.
    const budgetUtilization = summary.budgetUtilisation;
    let score = summary.finalDeliveredROI;

    if (summary.spentAllBudget) {
        score *= 0.1; // Massive penalty for not lasting the day
    } else if (budgetUtilization > 1.0) {
      score *= 0.5; // Heavy penalty for going over budget
    } else if (budgetUtilization < 0.90) {
      score *= 0.7; // Penalty for underspending
    } else {
      score *= (1 + (budgetUtilization - 0.90) * 2); // Bonus for being in the sweet spot, amplified
    }

    if (score > bestScore) {
      bestScore = score;
      bestROIs = currentROIs;
      bestResult = summary;
    }
    
    // Report iteration back to the UI
    onIteration({
        iteration: i + 1,
        roiTargets: currentROIs,
        budgetUtilization: summary.budgetUtilisation,
        deliveredROI: summary.finalDeliveredROI,
        score: score,
        isBest: bestROIs === currentROIs,
    });

    if (bestResult) {
        // Adjust ROIs based on budget utilization. Aim for 98%
        const budgetDiff = bestResult.budgetUtilisation - 0.98; 
        // If overspent, increase ROIs (lower bids). If underspent, decrease ROIs (higher bids).
        const adjustmentFactor = 1 - (budgetDiff * step); 
        bestROIs = bestROIs.map(r => Math.max(1, r * adjustmentFactor));
    }
  }

  return bestROIs.map(r => parseFloat(r.toFixed(2)));
}


export default function ROISimulator() {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLog, setOptimizationLog] = useState<OptimizationIteration[]>([]);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ROIFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aov: 300,
      budget: 100,
      roi1: 15,
      roi2: 15,
      roi3: 15,
      roi4: 15,
    },
  });

  const onSubmit: SubmitHandler<ROIFormValues> = async (data) => {
    setIsLoading(true);
    setResults(null);
    setFailureReason(null);
    const SELLER_ROI_TARGET = 5;

    const roiTargets = [data.roi1, data.roi2, data.roi3, data.roi4];
    const simulationResult = await runSimulation(roiTargets, data.aov, data.budget);
    
    setResults(simulationResult);

    if ('error' in simulationResult) {
       toast({
        variant: "destructive",
        title: "Simulation Warning",
        description: simulationResult.error,
      });
    }

    const { summary } = simulationResult;
    let reason = "";

    if (summary.spentAllBudget) {
      reason = "Budget was exhausted before the end of the day.";
    } else if (summary.budgetUtilisation < 0.8) {
      reason = `Budget utilization (${(summary.budgetUtilisation * 100).toFixed(1)}%) is below the 80% threshold.`;
    } else if (summary.finalDeliveredROI < SELLER_ROI_TARGET) {
      reason = `Delivered ROI (${summary.finalDeliveredROI.toFixed(2)}x) is less than the Seller-Asked ROI of ${SELLER_ROI_TARGET}x.`;
    }

    if (reason) {
      setFailureReason(reason);
    }
    
    setIsLoading(false);
  };
  
  const handleOptimize = async () => {
    setIsOptimizing(true);
    setResults(null);
    setFailureReason(null);
    setOptimizationLog([]);

    const handleIteration = (iteration: OptimizationIteration) => {
        setOptimizationLog(prevLog => [...prevLog, iteration]);
    };

    const optimalROIs = await findOptimalROIs(form.getValues, runSimulation, handleIteration);
    
    form.setValue('roi1', optimalROIs[0]);
    form.setValue('roi2', optimalROIs[1]);
    form.setValue('roi3', optimalROIs[2]);
    form.setValue('roi4', optimalROIs[3]);
    
    toast({
        title: "Optimal ROI Targets Found!",
        description: "The form has been updated. Running final simulation.",
    });

    // Short delay to allow user to see the "finalizing" state
    setTimeout(async () => {
        setIsOptimizing(false);
        // Automatically run simulation with optimized values
        await onSubmit(form.getValues());
    }, 1500);
  }

  return (
    <>
      <Dialog open={isOptimizing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Finding Optimal ROI Targets...</DialogTitle>
            <DialogDescription>
              The algorithm is running multiple simulations to find a set of ROI targets that maximizes returns while trying to spend the entire budget by the end of the day.
            </DialogDescription>
          </DialogHeader>
          <OptimizationLog log={optimizationLog} />
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <ROIInputForm form={form} onSubmit={onSubmit} onOptimize={handleOptimize} isLoading={isLoading} isOptimizing={isOptimizing} />
          <Card className="shadow-lg">
              <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-4 text-primary">How it Works</h3>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                      <li className="flex gap-3">
                          <IndianRupee className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span>Set your Average Order Value (AOV) and a daily budget.</span>
                      </li>
                      <li className="flex gap-3">
                          <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span>Input four ROI targets for consecutive 6-hour windows.</span>
                      </li>
                      <li className="flex gap-3">
                          <BrainCircuit className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span>Use "Find Optimal ROI" to get a suggested set of targets that aims for full budget use.</span>
                      </li>
                      <li className="flex gap-3">
                          <BarChart className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span>The simulation calculates bids and clicks, stopping if the budget is exhausted.</span>
                      </li>
                      <li className="flex gap-3">
                          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span>Analyze the results to see the trade-off between aggressive and conservative strategies.</span>
                      </li>
                  </ul>
              </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {(isLoading || isOptimizing) && !results && (
              <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
                  <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">{isOptimizing ? 'Optimizing targets...' : 'Running simulation...'}</p>
                  </div>
              </div>
          )}
          {results && !isLoading && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-500">
              <ResultsTable results={results.windows} />
              <SummaryCard summary={results.summary} failureReason={failureReason} />
            </div>

          )}
          {!isLoading && !isOptimizing && !results && (
              <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
                  <div className="text-center text-muted-foreground p-8">
                      <BarChart className="mx-auto h-12 w-12 mb-4" />
                      <h3 className="text-lg font-semibold">Ready to simulate?</h3>
                      <p>Enter your AOV and ROI targets and click "Run Simulation" to see your projected results.</p>
                  </div>
              </div>
          )}
        </div>
      </div>
    </>
  );
}
