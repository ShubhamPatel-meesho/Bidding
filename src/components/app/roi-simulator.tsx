"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from "@/hooks/use-toast";
import { runSimulation } from '@/lib/simulation';
import type { SimulationResults } from '@/lib/types';
import ROIInputForm, { formSchema, type ROIFormValues } from './roi-input-form';
import ResultsTable from './results-table';
import SummaryCard from './summary-card';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Clock, Droplets, Info, IndianRupee } from 'lucide-react';

export default function ROISimulator() {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

    const roiTargets = [data.roi1, data.roi2, data.roi3, data.roi4];
    const simulationResult = await runSimulation(roiTargets, data.aov, data.budget);

    if ('error' in simulationResult) {
       toast({
        variant: "destructive",
        title: "Simulation Warning",
        description: simulationResult.error,
      });
      // Still set results if there's an error, as the simulation runs with fallbacks
      if ('windows' in simulationResult) {
          setResults({ windows: simulationResult.windows, summary: simulationResult.summary });
      }
    } else {
      setResults(simulationResult);
    }
    
    setIsLoading(false);
  };

  return (
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
                        <Droplets className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <span>The simulation adjusts conversion rates based on your targets and AOV.</span>
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
        {isLoading && (
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
            <SummaryCard summary={results.summary} />
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
