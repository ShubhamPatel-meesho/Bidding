
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { runSimulation } from '@/lib/simulation';
import type { SimulationResults, LeaderboardEntry, OptimizationIteration } from '@/lib/types';
import ROIInputForm, { formSchema, type ROIFormValues } from './roi-input-form';
import ResultsTable from './results-table';
import SummaryCard from './summary-card';
import Leaderboard from './leaderboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bot, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResultsChart from './results-chart';
import { Button } from '../ui/button';
import { runOptimization } from '@/lib/optimization';
import OptimizationLog from './optimization-log';


export default function ROISimulator() {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLog, setOptimizationLog] = useState<OptimizationIteration[]>([]);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('leaderboard', []);
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
    setResults(null);
    setFailureReason(null);
    const SELLER_ROI_TARGET = data.sellerRoi;

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
      setLeaderboard([newEntry, ...leaderboard].sort((a,b) => b.finalDeliveredROI - a.finalDeliveredROI).slice(0, 10));
      toast({
        title: "Success!",
        description: `${data.name} was added to the leaderboard.`,
      });
      return { success: true, summary };
    }
  }

  const handleManualSubmit: SubmitHandler<ROIFormValues> = async (data) => {
    setIsLoading(true);
    await runAndProcessSimulation(data);
    setIsLoading(false);
  };
  
  const handleOptimizationSubmit: SubmitHandler<ROIFormValues> = async (data) => {
    setIsOptimizing(true);
    setOptimizationLog([]); // Clear previous logs
    
    const onIteration = (log: OptimizationIteration) => {
      setOptimizationLog(prev => [...prev, log]);
    };

    try {
      const optimalTargets = await runOptimization({
        aov: data.aov,
        budget: data.budget,
        sellerRoiTarget: data.sellerRoi,
        initialRoiTargets: [data.roi1, data.roi2, data.roi3, data.roi4]
      }, onIteration);

      toast({
        title: "Optimization Complete",
        description: "Optimal ROI targets have been found and applied.",
      });

      // Set form values to the optimal ones and run a final simulation
      form.setValue('roi1', optimalTargets[0]);
      form.setValue('roi2', optimalTargets[1]);
      form.setValue('roi3', optimalTargets[2]);
      form.setValue('roi4', optimalTargets[3]);
      
      await runAndProcessSimulation({
        ...data,
        roi1: optimalTargets[0],
        roi2: optimalTargets[1],
        roi3: optimalTargets[2],
        roi4: optimalTargets[3],
      });

    } catch (error) {
      console.error("Optimization failed:", error);
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: "Could not find an optimal strategy.",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLeaderboardSelect = (entry: LeaderboardEntry) => {
    form.setValue('name', entry.name);
    form.setValue('aov', entry.aov, { shouldValidate: true });
    form.setValue('budget', entry.budget, { shouldValidate: true });
    form.setValue('sellerRoi', entry.sellerRoi, { shouldValidate: true });
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

  const isLoadingOrOptimizing = isLoading || isOptimizing;

  return (
    <Tabs defaultValue="simulator" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="simulator">Simulator</TabsTrigger>
        <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
      </TabsList>
      <TabsContent value="simulator" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <ROIInputForm form={form} onSubmit={handleManualSubmit} isLoading={isLoadingOrOptimizing}/>
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
            {results && !isLoadingOrOptimizing && (
              <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                <SummaryCard summary={results.summary} failureReason={failureReason} />
                <ResultsChart results={results.windows} />
                <ResultsTable results={results.windows} />
              </div>
            )}
             {!isLoadingOrOptimizing && !results && (
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
      <TabsContent value="optimizer" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-8">
               <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>AI-Powered Optimization</CardTitle>
                  <CardDescription>Let the AI find the best ROI targets to maximize performance while meeting your goals.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={form.handleSubmit(handleOptimizationSubmit)} className="w-full" disabled={isLoadingOrOptimizing}>
                    {isOptimizing ? 'Optimizing...' : <> <Bot className="mr-2 h-4 w-4" /> Find Optimal ROI </>}
                  </Button>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              {isOptimizing && (
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-center p-8 bg-card rounded-lg border shadow-lg">
                        <div className="flex items-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="text-muted-foreground">AI is running simulations to find the best strategy...</p>
                        </div>
                    </div>
                    <OptimizationLog log={optimizationLog} />
                  </div>
              )}
               {results && !isLoadingOrOptimizing && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                  <SummaryCard summary={results.summary} failureReason={failureReason} />
                  <ResultsChart results={results.windows} />
                  <ResultsTable results={results.windows} />
                </div>
              )}
              {!isOptimizing && !results && (
                  <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
                      <div className="text-center text-muted-foreground p-8">
                          <Bot className="mx-auto h-12 w-12 mb-4" />
                          <h3 className="text-lg font-semibold">Ready to Optimize?</h3>
                          <p>Click "Find Optimal ROI" and the AI will test different strategies to find the best one for you.</p>
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
