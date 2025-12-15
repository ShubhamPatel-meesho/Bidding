
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { runSimulation } from '@/lib/simulation';
import type { SimulationResults, SimulationSummary, LeaderboardEntry } from '@/lib/types';
import ROIInputForm, { formSchema, type ROIFormValues } from './roi-input-form';
import ResultsTable from './results-table';
import SummaryCard from './summary-card';
import Leaderboard from './leaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Clock, Info, IndianRupee } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function ROISimulator() {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('leaderboard', []);
  const { toast } = useToast();

  const form = useForm<ROIFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Strategy #${leaderboard.length + 1}`,
      aov: 300,
      budget: 300,
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
    } else {
      // Success! Add to leaderboard
      const newEntry: LeaderboardEntry = {
        id: new Date().toISOString(),
        name: data.name,
        finalDeliveredROI: summary.finalDeliveredROI,
        budgetUtilisation: summary.budgetUtilisation,
        roiTargets: roiTargets,
        aov: data.aov,
        budget: data.budget
      };
      setLeaderboard([newEntry, ...leaderboard].sort((a,b) => b.finalDeliveredROI - a.finalDeliveredROI).slice(0, 10));
      toast({
        title: "Success!",
        description: `${data.name} was added to the leaderboard.`,
      });
      form.setValue('name', `Strategy #${leaderboard.length + 2}`);
    }
    
    setIsLoading(false);
  };

  const handleLeaderboardSelect = (entry: LeaderboardEntry) => {
    form.setValue('name', entry.name);
    form.setValue('aov', entry.aov);
    form.setValue('budget', entry.budget);
    form.setValue('roi1', entry.roiTargets[0]);
    form.setValue('roi2', entry.roiTargets[1]);
    form.setValue('roi3', entry.roiTargets[2]);
    form.setValue('roi4', entry.roiTargets[3]);
    toast({
      title: 'Loaded from Leaderboard',
      description: `Parameters for "${entry.name}" have been loaded into the form.`,
    });
  }

  const handleLeaderboardDelete = (id: string) => {
    setLeaderboard(leaderboard.filter(entry => entry.id !== id));
    toast({
      title: 'Entry Deleted',
      description: `The entry has been removed from the leaderboard.`,
    });
  }

  return (
    <Tabs defaultValue="simulator" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="simulator">Simulator</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
      </TabsList>
      <TabsContent value="simulator" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <ROIInputForm form={form} onSubmit={onSubmit} isLoading={isLoading} />
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
                <ResultsTable results={results.windows} />
                <SummaryCard summary={results.summary} failureReason={failureReason} />
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
      </TabsContent>
      <TabsContent value="leaderboard" className="mt-6">
        {leaderboard.length > 0 ? (
            <Leaderboard entries={leaderboard} onSelect={handleLeaderboardSelect} onDelete={handleLeaderboardDelete} />
        ) : (
            <div className="flex items-center justify-center h-[400px] bg-card rounded-lg border shadow-lg">
                <div className="text-center text-muted-foreground p-8">
                    <BarChart className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Leaderboard is Empty</h3>
                    <p>Successful simulation runs will appear here.</p>
                </div>
            </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
