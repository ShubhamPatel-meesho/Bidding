
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { runSimulation } from '@/lib/simulation';
import type { SimulationResults, LeaderboardEntry } from '@/lib/types';
import ROIInputForm, { formSchema, type ROIFormValues } from './roi-input-form';
import SummaryCard from './summary-card';
import { BarChart } from 'lucide-react';
import ResultsTable from './results-table';

interface ROISimulatorProps {
    leaderboard: LeaderboardEntry[];
    setLeaderboard: (value: LeaderboardEntry[]) => void;
}


export default function ROISimulator({ leaderboard, setLeaderboard}: ROISimulatorProps) {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ROIFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `My Strategy`,
      aov: 300,
      budget: 300,
      sellerRoi: 8,
      roi1: 15,
      roi2: 15,
      roi3: 15,
      roi4: 15,
    },
  });

  const runAndProcessSimulation: SubmitHandler<ROIFormValues> = async (data) => {
    setIsLoading(true);
    setResults(null);
    setFailureReason(null);
    const SELLER_ROI_TARGET = data.sellerRoi;

    const roiTargets = [data.roi1, data.roi2, data.roi3, data.roi4];
    const simulationResult = await runSimulation(roiTargets, data.aov, data.budget);
    
    setResults(simulationResult);
    setIsLoading(false);

    if ('error' in simulationResult) {
       toast({
        variant: "destructive",
        title: "Simulation Warning",
        description: simulationResult.error,
      });
    }

    const { summary } = simulationResult;
    const reasons: string[] = [];

    if (summary.spentAllBudget) {
      reasons.push("Budget was exhausted before the end of the day.");
    }
    if (summary.budgetUtilisation < 0.8) {
      reasons.push(`Budget utilization (${(summary.budgetUtilisation * 100).toFixed(1)}%) is below the 80% threshold.`);
    }
    if (summary.finalDeliveredROI < SELLER_ROI_TARGET) {
      reasons.push(`Delivered ROI (${summary.finalDeliveredROI.toFixed(2)}x) is less than the Seller-Asked ROI of ${SELLER_ROI_TARGET}x.`);
    }

    if (reasons.length > 0) {
      setFailureReason(reasons.join(' '));
      return { success: false, summary };
    } else {
      // Success! Add to leaderboard
      const newEntry: LeaderboardEntry = {
        id: new Date().toISOString(),
        name: data.name,
        finalDeliveredROI: summary.finalDeliveredROI,
        budgetUtilisation: summary.budgetUtilisation,
        totalOrders: summary.totalOrders,
        roiTargets: roiTargets,
        aov: data.aov,
        budget: data.budget,
        sellerRoi: data.sellerRoi,
      };
      setLeaderboard([newEntry, ...leaderboard].sort((a,b) => (b.totalOrders ?? 0) - (a.totalOrders ?? 0)).slice(0, 10));
      toast({
        title: "Success!",
        description: `${data.name} was added to the leaderboard.`,
      });
      return { success: true, summary };
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 flex flex-col gap-8">
        <ROIInputForm form={form} onSubmit={runAndProcessSimulation} isLoading={isLoading}/>
      </div>
      <div className="lg:col-span-2">
        {isLoading && !results && (
            <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Running simulation...</p>
                </div>
            </div>
        )}
        {results && !isLoading && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <SummaryCard summary={results.summary} failureReason={failureReason} />
            <ResultsTable results={results.windows} />
          </div>
        )}
         {!isLoading && !results && (
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
  );
}
