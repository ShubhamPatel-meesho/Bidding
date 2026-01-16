

"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, IndianRupee, Target, Cog, HelpCircle, Percent, CalendarDays, Save, Trash2, Repeat, Trophy, Square, AreaChart } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import type { TimeIntervalResult, MultiDayLeaderboardEntry } from '@/lib/types';
import { runMultiDaySimulation } from '@/lib/simulation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CustomChartTooltip } from './chart-tooltip';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MULTI_DAY_SIMULATOR_DEFAULTS } from '@/lib/defaults';


const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialTargetRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialDeliveredRoi: z.coerce.number().positive({ message: "Must be positive" }),
  dailyBudget: z.coerce.number().positive({ message: "Must be positive" }),
  aov: z.coerce.number().positive({ message: "AOV must be positive" }),
  basePCVR: z.coerce.number().min(0, { message: "Must be non-negative" }),
  overallError: z.coerce.number(), // Can be positive or negative
  dayVolatility: z.coerce.number().min(0).max(100, { message: "Must be between 0 and 100" }),
  volatility: z.coerce.number().min(0).max(100, { message: "Must be between 0 and 100" }),
  upperProb: z.coerce.number().min(0).max(100),
  highProb: z.coerce.number().min(0).max(100),
  midProb: z.coerce.number().min(0).max(100),
  lowProb: z.coerce.number().min(0).max(100),
  pacingP: z.coerce.number().min(0),
  pacingI: z.coerce.number().min(0),
  pacingD: z.coerce.number().min(0),
  bpP: z.coerce.number().min(0),
  nValue: z.coerce.number().positive({ message: "Must be positive" }),
  kValue: z.coerce.number().positive({ message: "Must be positive" }),
  bpKValue: z.coerce.number().positive({ message: "Must be positive" }),
  numDays: z.coerce.number().positive().int().min(1, "At least 1 day"),
  modules: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one module.",
  }),
});

type MultiDayFormValues = z.infer<typeof formSchema>;

const formatRoi = (value: number) => value.toFixed(2);
const formatCurrency = (value: number) => `₹${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatYAxisCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
};
const formatYAxisNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
}
const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
const formatSmallPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const modules = [
  { id: 'rp', label: 'ROI Pacing' },
  { id: 'bp', label: 'Budget Pacing' },
];

const seriesVisibilityInitialState: Record<string, boolean> = {
  dayCumulativeGmv: true,
  dayROI: true,
  deliveredROI: true,
  targetROI: true,
  slRoi: true,
  dayCumulativeClicks: true,
};

type SeriesVisibility = typeof seriesVisibilityInitialState;


const CustomLegend = (props: any) => {
  const { payload, onToggle, visibleSeries } = props;
  const items = payload.map((entry: any) => {
      const { dataKey, color, type } = entry;
      const nameMapping: { [key: string]: string } = {
          'dayCumulativeGmv': 'Catalog GMV',
          'dayROI': 'Day ROI',
          'deliveredROI': 'Catalog ROI',
          'targetROI': 'ROI Target',
          'slRoi': 'ROI Min',
          'dayCumulativeClicks': 'Daily Clicks',
      };
      const finalName = nameMapping[dataKey];
      if (!finalName) return null;
      return { dataKey, name: finalName, color, type };
  }).filter(Boolean);

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {items.map((item) => (
        <button 
          key={item.name} 
          className={cn(
            "flex items-center gap-2 text-sm cursor-pointer",
            !visibleSeries[item.dataKey] && "opacity-50"
          )}
          onClick={() => onToggle(item.dataKey)}
        >
          {item.type === 'line' || item.type === 'area' ? (
              <div className="w-2.5 h-px" style={{backgroundColor: item.color}}></div>
          ) : (
             <span className="w-2.5 h-2.5" style={{ backgroundColor: item.color }}></span>
          )}
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
};


export default function MultiDaySimulator() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TimeIntervalResult[] | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const simulationStateRef = useRef<{ running: boolean }>({ running: false });
  const [visibleSeries, setVisibleSeries] = useState<SeriesVisibility>(seriesVisibilityInitialState);

  const toggleSeries = (dataKey: keyof SeriesVisibility) => {
    setVisibleSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };


  useEffect(() => {
    setIsMounted(true);
    // Cleanup on unmount
    return () => {
      simulationStateRef.current.running = false;
    }
  }, []);

  const [leaderboard, setLeaderboard] = useLocalStorage<MultiDayLeaderboardEntry[]>('multiday-leaderboard', []);
  const [lastRunData, setLastRunData] = useState<MultiDayFormValues | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MultiDayLeaderboardEntry | null>(null);

  const form = useForm<MultiDayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...MULTI_DAY_SIMULATOR_DEFAULTS,
      name: `${MULTI_DAY_SIMULATOR_DEFAULTS.name} #${leaderboard.length + 1}`
    },
  });

  useEffect(() => {
    if (selectedEntry) {
      form.reset({
        ...selectedEntry,
        name: selectedEntry.name || `Clone of ${selectedEntry.id.substring(0,4)}`,
        basePCVR: selectedEntry.basePCVR * 100, // convert back to percentage for display
        overallError: selectedEntry.overallError * 100, // convert back to percentage for display
        dayVolatility: selectedEntry.dayVolatility * 100,
        volatility: selectedEntry.volatility * 100, // convert back to percentage for display
        upperProb: selectedEntry.upperProb * 100,
        highProb: selectedEntry.highProb * 100,
        midProb: selectedEntry.midProb * 100,
        lowProb: selectedEntry.lowProb * 100,
        bpP: selectedEntry.bpP ?? 20,
        modules: selectedEntry.modules ?? ['rp', 'bp'],
        bpKValue: selectedEntry.bpKValue ?? 75,
      });
      if(selectedEntry.results) {
          setResults(selectedEntry.results);
      }
      setSelectedEntry(null);
    }
  }, [selectedEntry, form]);

  const runAndProcessSimulation: SubmitHandler<MultiDayFormValues> = async (data) => {
    setIsLoading(true);
    setResults([]);
    setProgress(0);
    setLastRunData(data);
    simulationStateRef.current.running = true;
    
    // Using a timeout allows the UI to update to show the loading state.
    setTimeout(async () => {
      const simulationParams = {
        ...data,
        basePCVR: data.basePCVR / 100, // Convert from % to decimal
        overallError: data.overallError / 100, // Convert from % to decimal
        dayVolatility: data.dayVolatility / 100,
        volatility: data.volatility / 100, // Convert from % to decimal
        upperProb: data.upperProb / 100,
        highProb: data.highProb / 100,
        midProb: data.midProb / 100,
        lowProb: data.lowProb / 100,
      };
      
      const simulationGenerator = runMultiDaySimulation(simulationParams);

      let tempResults: TimeIntervalResult[] = [];
      const totalIntervals = data.numDays * 48;
      let processedIntervals = 0;
      
      const processChunk = async () => {
        if (!simulationStateRef.current.running) {
          setIsLoading(false);
          toast({
            variant: 'destructive',
            title: "Simulation Stopped",
            description: "The simulation was cancelled by the user."
          });
          return;
        }

        let result: IteratorResult<TimeIntervalResult | undefined, void> | undefined;

        try {
          result = await simulationGenerator.next();
        } catch (error) {
          console.error("Simulation error:", error);
          setIsLoading(false);
          simulationStateRef.current.running = false;
          toast({
            variant: "destructive",
            title: "Simulation Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
          });
          return;
        }

        if (result.value) {
            tempResults.push(result.value);
            processedIntervals++;
            setResults([...tempResults]);
            setProgress((processedIntervals / totalIntervals) * 100);
        }
        
        if (!result.done) {
            requestAnimationFrame(processChunk);
        } else {
            setIsLoading(false);
            simulationStateRef.current.running = false;
            toast({
              title: "Simulation Complete",
              description: `Finished running ${data.numDays}-day simulation.`
            })
        }
      };
      
      requestAnimationFrame(processChunk);

    }, 10);
  }

  const stopSimulation = () => {
    simulationStateRef.current.running = false;
  }

  const handleSaveRun = () => {
    if (!lastRunData || !results || results.length === 0) return;

    const finalInterval = results[results.length - 1];
    
    const newEntry: MultiDayLeaderboardEntry = {
        id: new Date().toISOString(),
        name: lastRunData.name,
        finalDeliveredROI: finalInterval.deliveredROI,
        finalBudgetUtilisation: finalInterval.dayBudgetUtilisation, // This is for the last day
        ...lastRunData,
        results: results,
        basePCVR: lastRunData.basePCVR / 100,
        overallError: lastRunData.overallError / 100,
        dayVolatility: lastRunData.dayVolatility / 100,
        volatility: lastRunData.volatility / 100,
        upperProb: lastRunData.upperProb / 100,
        highProb: lastRunData.highProb / 100,
        midProb: lastRunData.midProb / 100,
        lowProb: lastRunData.lowProb / 100,
    };
    
    setLeaderboard(current => [newEntry, ...current].sort((a, b) => b.finalDeliveredROI - a.finalDeliveredROI).slice(0, 20));
    toast({
      title: "Run Saved!",
      description: `"${lastRunData.name}" has been saved.`
    });
  }

  const handleLeaderboardSelect = (entry: MultiDayLeaderboardEntry) => {
    setSelectedEntry(entry);
    toast({
      title: 'Loading Strategy...',
      description: `"${entry.name}" parameters have been loaded into the form.`,
    });
  };

  const handleLeaderboardDelete = (id: string) => {
    setLeaderboard(leaderboard.filter(entry => entry.id !== id));
    toast({
      title: 'Entry Deleted',
      description: `The entry has been removed.`,
    });
  };

  const dailyTotals = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const dayData: { [key: number]: { spend: number, gmv: number, clicks: number, orders: number, weightedTargetROI: number, totalClicksForWeight: number, weightedPcvr: number, totalPcvr: number, intervalCount: number, dayCumulativeGmv: number} } = {};
    results.forEach(r => {
      dayData[r.day] = dayData[r.day] || { spend: 0, gmv: 0, clicks: 0, orders: 0, weightedTargetROI: 0, totalClicksForWeight: 0, weightedPcvr: 0, totalPcvr: 0, intervalCount: 0, dayCumulativeGmv: 0 };
      const day = dayData[r.day];
      day.spend += r.spend;
      day.gmv += r.gmv;
      day.clicks += r.clicks;
      day.orders += r.orders;
      day.weightedTargetROI += r.targetROI * r.clicks;
      day.weightedPcvr += r.pCvr * r.clicks;
      day.totalClicksForWeight += r.clicks;
      day.totalPcvr += r.pCvr;
      day.intervalCount += 1;
      day.dayCumulativeGmv = r.dayCumulativeGmv;
    });

    return Object.entries(dayData).map(([day, data]) => ({
      day: parseInt(day, 10),
      ...data
    }));
  }, [results]);

  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Multi-Day Bidding Algorithm</CardTitle>
          <CardDescription>Configure the parameters for the ROI and Budget Pacing controllers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(runAndProcessSimulation)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Run Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="My Winning Strategy" {...field} className="pl-8" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="modules"
                  render={() => (
                    <FormItem>
                      <FormLabel>Active Modules</FormLabel>
                      <div className="flex items-center gap-4 pt-2">
                        {modules.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="modules"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              item.id,
                                            ])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="numDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Simulation Days</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dailyBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Budget</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="300" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aov"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Order Value</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slRoi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop-loss ROI</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="10" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialTargetRoi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Target ROI</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialDeliveredRoi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Delivered ROI</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Catalog Profile</CardTitle>
                        <CardDescription>Define the underlying performance characteristics and market competition for this catalog.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        <div>
                            <p className="text-sm font-medium mb-4">pCVR Configuration</p>
                            <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="basePCVR"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Base pCVR (for Bidding)</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="0.01" {...field} className="pl-8" />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="overallError"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Overall Error</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="dayVolatility"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Day-on-Day Volatility</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="volatility"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Interval Volatility</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-4">Click Probability</p>
                            <div className="space-y-4">
                               <FormField
                                  control={form.control}
                                  name="upperProb"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Prob. at ₹2.00 bid</FormLabel>
                                      <FormControl>
                                      <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                      </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="highProb"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Prob. at ₹1.00 bid</FormLabel>
                                      <FormControl>
                                      <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                      </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="midProb"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Prob. at ₹0.15 bid</FormLabel>
                                      <FormControl>
                                      <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                      </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="lowProb"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Prob. at ₹0.04 bid</FormLabel>
                                      <FormControl>
                                      <div className="relative">
                                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input type="number" step="1" {...field} className="pl-8" />
                                      </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Module Parameters</CardTitle>
                        <CardDescription>Adjust the sensitivity and responsiveness of the ROI and Budget Pacing algorithms.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        <div>
                            <p className="text-sm font-medium mb-4">ROI Pacing (PID)</p>
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name="pacingP"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>P</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="pacingI"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>I</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="pacingD"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>D</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                            <div className="mt-6">
                                <p className="text-sm font-medium mb-4">Budget Pacing</p>
                                <FormField
                                  control={form.control}
                                  name="bpP"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>P</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                        </div>
                        <div>
                           <p className="text-sm font-medium mb-4">PID Windowing</p>
                           <TooltipProvider>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="nValue"
                                      render={({ field }) => (
                                        <FormItem>
                                          <div className="flex items-center gap-1">
                                            <FormLabel>N</FormLabel>
                                            <UiTooltip>
                                              <TooltipTrigger asChild>
                                                <button type="button">
                                                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Clicks for ROI calculation</p>
                                              </TooltipContent>
                                            </UiTooltip>
                                          </div>
                                          <FormControl>
                                            <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="kValue"
                                      render={({ field }) => (
                                        <FormItem>
                                          <div className="flex items-center gap-1">
                                            <FormLabel>RP K</FormLabel>
                                            <UiTooltip>
                                              <TooltipTrigger asChild>
                                                <button type="button">
                                                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Clicks for RP update</p>
                                              </TooltipContent>
                                            </UiTooltip>
                                          </div>
                                          <FormControl>
                                            <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="bpKValue"
                                      render={({ field }) => (
                                        <FormItem>
                                          <div className="flex items-center gap-1">
                                            <FormLabel>BP K</FormLabel>
                                            <UiTooltip>
                                              <TooltipTrigger asChild>
                                                <button type="button">
                                                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Clicks for BP update</p>
                                              </TooltipContent>
                                            </UiTooltip>
                                          </div>
                                          <FormControl>
                                            <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                            </TooltipProvider>
                        </div>
                    </CardContent>
                </Card>
              </div>

               {lastRunData && !isLoading && (
                <Card>
                  <CardHeader>
                    <CardTitle>Save Run</CardTitle>
                    <CardDescription>Save the parameters and results of this simulation run.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                       <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormLabel className="sr-only">Run Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="My Winning Strategy" {...field} className="pl-8" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <Button onClick={handleSaveRun} type="button">
                        <Save className="mr-2 h-4 w-4" /> Save Run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-4">
                <Button type="submit" className="w-full lg:w-auto" disabled={isLoading}>
                  <Sparkles className="mr-2 h-4 w-4" /> Run Simulation
                </Button>
                {isLoading && (
                  <Button type="button" variant="destructive" onClick={stopSimulation}>
                    <Square className="mr-2 h-4 w-4" /> Stop Simulation
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="w-full flex flex-col gap-8">
        {isLoading && (!results || results.length === 0) && (
          <div className="flex items-center justify-center h-full min-h-[60vh] bg-card rounded-lg border shadow-lg">
            <div className="w-full max-w-md p-8 text-center">
              <p className="text-lg font-semibold mb-2">Running {form.getValues('numDays')}-day simulation... ({progress.toFixed(0)}%)</p>
              <p className="text-muted-foreground mb-4">
                Please wait while we process the bidding algorithm across thousands of intervals.
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
             {isLoading && (
               <div className="w-full max-w-md p-4 text-center mx-auto">
                  <p className="text-lg font-semibold mb-2">Running {form.getValues('numDays')}-day simulation... ({progress.toFixed(0)}%)</p>
                  <Progress value={progress} className="w-full" />
                </div>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>{form.getValues('numDays')}-Day Performance</CardTitle>
                    <CardDescription>Intra-day performance of the bidding algorithm at 30-min intervals.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[60vh] w-full">
                        <ResponsiveContainer>
                             <ComposedChart data={results} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="timestamp" 
                                    tickFormatter={(ts, index) => (index % 48 === 0) ? `Day ${Math.floor(index/48)+1}` : ''}
                                    tickLine={false}
                                    label={{ value: 'Interval (30 mins)', position: 'insideBottom', offset: -15 }}
                                />
                                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" label={{ value: 'ROI', angle: -90, position: 'insideLeft' }} />
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" tickFormatter={formatYAxisCurrency} label={{ value: 'GMV', angle: 90, position: 'insideRight' }}/>
                                 <YAxis yAxisId="clicks" orientation="right" stroke="hsl(var(--chart-3))" tickFormatter={formatYAxisNumber} label={{ value: 'Clicks', angle: 90, position: 'insideRight', offset: 40 }} />
                                <Tooltip 
                                    content={<CustomChartTooltip />}
                                />
                                <Legend 
                                    content={<CustomLegend onToggle={toggleSeries} visibleSeries={visibleSeries} />} 
                                    wrapperStyle={{ bottom: 0 }} 
                                />
                                <defs>
                                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area yAxisId="right" type="monotone" dataKey="dayCumulativeGmv" name="Catalog GMV" stroke="hsl(var(--chart-2))" fill="url(#colorGmv)" hide={!visibleSeries.dayCumulativeGmv} />
                                <Line yAxisId="clicks" type="monotone" dataKey="dayCumulativeClicks" name="Daily Clicks" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} hide={!visibleSeries.dayCumulativeClicks} />
                                <Bar yAxisId="left" dataKey="dayROI" name="Day ROI" fill="hsl(var(--chart-1))" hide={!visibleSeries.dayROI} />
                                <Line yAxisId="left" type="monotone" dataKey="deliveredROI" name="Catalog ROI" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} hide={!visibleSeries.deliveredROI} />
                                <Line yAxisId="left" type="step" dataKey="targetROI" name="ROI Target" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} hide={!visibleSeries.targetROI} />
                                <Line yAxisId="left" type="monotone" dataKey="slRoi" name="ROI Min" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} hide={!visibleSeries.slRoi} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Daily Totals</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Day</TableHead>
                                <TableHead className="text-right">Delivered ROI</TableHead>
                                <TableHead className="text-right">Avg. Target ROI</TableHead>
                                <TableHead className="text-right">Avg. pCVR</TableHead>
                                <TableHead className="text-right">Clicks-Wt pCVR</TableHead>
                                <TableHead className="text-right">Actual O/C</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Clicks</TableHead>
                                <TableHead className="text-right">Spends</TableHead>
                                <TableHead className="text-right">GMV</TableHead>
                                <TableHead className="text-right">Budget Utilisation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dailyTotals.map((day, index) => {
                                const deliveredROI = day.spend > 0 ? day.gmv / day.spend : 0;
                                const budgetUtilisation = form.getValues('dailyBudget') > 0 ? day.spend / form.getValues('dailyBudget') : 0;
                                const avgTargetROI = day.totalClicksForWeight > 0 ? day.weightedTargetROI / day.totalClicksForWeight : 0;
                                const avgPcvr = day.intervalCount > 0 ? day.totalPcvr / day.intervalCount : 0;
                                const weightedPcvr = day.totalClicksForWeight > 0 ? day.weightedPcvr / day.totalClicksForWeight : 0;
                                const ordersToClicksRatio = day.clicks > 0 ? day.orders / day.clicks : 0;
                                return (
                                    <TableRow key={`day-total-${index}`}>
                                        <TableCell>Day {day.day}</TableCell>
                                        <TableCell className="text-right">{formatRoi(deliveredROI)}</TableCell>
                                        <TableCell className="text-right">{formatRoi(avgTargetROI)}</TableCell>
                                        <TableCell className="text-right">{formatSmallPercent(avgPcvr)}</TableCell>
                                        <TableCell className="text-right">{formatSmallPercent(weightedPcvr)}</TableCell>
                                        <TableCell className="text-right">{formatSmallPercent(ordersToClicksRatio)}</TableCell>
                                        <TableCell className="text-right">{day.orders.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{day.clicks.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(day.spend)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(day.dayCumulativeGmv)}</TableCell>
                                        <TableCell className="text-right">{formatPercent(budgetUtilisation)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </div>
        )}
        
         {!results || results.length === 0 && !isLoading &&(
          <div className="flex items-center justify-center h-full min-h-[60vh] bg-card rounded-lg border shadow-lg">
              <div className="text-center text-muted-foreground p-8">
                  <Cog className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">Ready to run the multi-day simulation?</h3>
                  <p>Configure your algorithm parameters and click "Run" to begin.</p>
              </div>
          </div>
        )}

        {isMounted && leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Runs</CardTitle>
              <CardDescription>Load a previously saved simulation run.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>SL ROI</TableHead>
                    <TableHead className="text-right">Final ROI</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>{entry.numDays}</TableCell>
                      <TableCell>{entry.slRoi}x</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatRoi(entry.finalDeliveredROI)}</TableCell>
                      <TableCell className="text-right">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLeaderboardSelect(entry)}
                          >
                            <Repeat className="mr-2 h-4 w-4" />
                            Load
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className='h-9 w-9'>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the "{entry.name}" run.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleLeaderboardDelete(entry.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

    

    
