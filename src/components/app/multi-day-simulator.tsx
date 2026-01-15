
"use client";

import { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, IndianRupee, Target, Cog, HelpCircle, Percent, CalendarDays } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import type { TimeIntervalResult } from '@/lib/types';
import { runMultiDaySimulation } from '@/lib/simulation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CustomChartTooltip } from './chart-tooltip';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


const formSchema = z.object({
  slRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialTargetRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialDeliveredRoi: z.coerce.number().positive({ message: "Must be positive" }),
  dailyBudget: z.coerce.number().positive({ message: "Must be positive" }),
  aov: z.coerce.number().positive({ message: "AOV must be positive" }),
  basePCVR: z.coerce.number().min(0, { message: "Must be non-negative" }),
  calibrationError: z.coerce.number().min(0).max(100, { message: "Must be between 0 and 100" }),
  pacingP: z.coerce.number().min(0),
  pacingI: z.coerce.number().min(0),
  pacingD: z.coerce.number().min(0),
  nValue: z.coerce.number().positive({ message: "Must be positive" }),
  kValue: z.coerce.number().positive({ message: "Must be positive" }),
  numDays: z.coerce.number().positive().int().min(1, "At least 1 day"),
});

type MultiDayFormValues = z.infer<typeof formSchema>;

const formatRoi = (value: number) => value.toFixed(2);
const formatCurrency = (value: number) => `₹${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

const CustomLegend = (props: any) => {
  const { payload } = props;
  const items = payload.map((entry: any) => {
      const { dataKey, color } = entry;
      // Remap names for legend
      const nameMapping: { [key: string]: string } = {
          'dayCumulativeGmv': 'Catalog GMV',
          'dayROI': 'Day ROI',
          'dayCumulativeClicks': 'Daily Clicks',
          'deliveredROI': 'Catalog ROI',
          'targetROI': 'ROI Target',
          'slRoi': 'ROI Min',
      };
      return { name: nameMapping[dataKey] || dataKey, color };
  });

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5" style={{ backgroundColor: item.color }}></span>
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  );
};


export default function MultiDaySimulator() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TimeIntervalResult[] | null>(null);
  const [progress, setProgress] = useState(0);

  const form = useForm<MultiDayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slRoi: 20, // Stop-loss ROI
      initialTargetRoi: 15,
      initialDeliveredRoi: 20,
      dailyBudget: 300,
      aov: 300,
      basePCVR: 1, // 1%
      calibrationError: 20, // 20%
      pacingP: 0.2,
      pacingI: 0,
      pacingD: 0,
      nValue: 3000,
      kValue: 600,
      numDays: 3,
    },
  });

  const runAndProcessSimulation: SubmitHandler<MultiDayFormValues> = async (data) => {
    setIsLoading(true);
    setResults([]);
    setProgress(0);
    
    // Using a timeout allows the UI to update to show the loading state.
    setTimeout(async () => {
      const simulationGenerator = runMultiDaySimulation({
          ...data,
          basePCVR: data.basePCVR / 100, // Convert from % to decimal
          calibrationError: data.calibrationError / 100, // Convert from % to decimal
      });

      let tempResults: TimeIntervalResult[] = [];
      const totalIntervals = data.numDays * 48;
      let processedIntervals = 0;

      const processChunk = async () => {
        for (let i = 0; i < 48; i++) { // Process one day at a time for smoother updates
            const result = await simulationGenerator.next();
            if (!result.done) {
                tempResults.push(result.value);
                processedIntervals++;
            } else {
                break;
            }
        }

        setResults([...tempResults]);
        setProgress((processedIntervals / totalIntervals) * 100);

        if (processedIntervals < totalIntervals) {
            requestAnimationFrame(processChunk);
        } else {
            setIsLoading(false);
        }
      };
      
      requestAnimationFrame(processChunk);

    }, 10);
  }

  const dailyTotals = useMemo(() => {
    if (!results) return [];
    const totals: { [key: number]: { day: number; spend: number; gmv: number; clicks: number; orders: number; weightedTargetROI: number, totalClicksForWeight: number } } = {};
    results.forEach(r => {
        if (!totals[r.day]) {
            totals[r.day] = { day: r.day, spend: 0, gmv: 0, clicks: 0, orders: 0, weightedTargetROI: 0, totalClicksForWeight: 0 };
        }
        const dayTotal = totals[r.day];
        dayTotal.spend += r.spend;
        dayTotal.gmv += r.gmv;
        dayTotal.clicks += r.clicks;
        dayTotal.orders += r.orders;
        dayTotal.weightedTargetROI += r.targetROI * r.clicks;
        dayTotal.totalClicksForWeight += r.clicks;
    });
    return Object.values(totals);
  }, [results]);

  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Multi-Day Bidding Algorithm</CardTitle>
          <CardDescription>Configure the parameters for the ROI Pacing controller.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(runAndProcessSimulation)} className="space-y-6">
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
                          <Input type="number" placeholder="20" {...field} className="pl-8" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium mb-2">pCVR Configuration</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="basePCVR"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base pCVR</FormLabel>
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
                        name="calibrationError"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calib. Error</FormLabel>
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
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium mb-2">PID Controller Gains</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="pacingP"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>P (Proportional)</FormLabel>
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
                            <FormLabel>I (Integral)</FormLabel>
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
                            <FormLabel>D (Derivative)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <TooltipProvider>
                      <p className="text-sm font-medium mb-2">PID Windowing</p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="nValue"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-1">
                                <FormLabel>N</FormLabel>
                                <UiTooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
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
                                <FormLabel>K</FormLabel>
                                <UiTooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Clicks for PID update</p>
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
                  </CardContent>
                </Card>
              </div>
              <Button type="submit" className="w-full lg:w-auto" disabled={isLoading}>
                {isLoading ? 'Simulating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Run Simulation </>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="w-full">
        {isLoading && (
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
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                                <Tooltip 
                                    content={<CustomChartTooltip />}
                                />
                                <Legend content={<CustomLegend />} wrapperStyle={{ bottom: 0 }} />
                                <Area yAxisId="right" type="monotone" dataKey="dayCumulativeGmv" name="Catalog GMV" fill="hsl(var(--chart-2))" stroke="hsl(var(--chart-2))" dot={false} />
                                <Bar yAxisId="left" dataKey="dayROI" name="Day ROI" fill="hsl(var(--chart-1))" />
                                <Line yAxisId="right" type="monotone" dataKey="dayCumulativeClicks" name="Daily Clicks" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false}/>
                                <Line yAxisId="left" type="monotone" dataKey="deliveredROI" name="Catalog ROI" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false}/>
                                <Line yAxisId="left" type="step" dataKey="targetROI" name="ROI Target" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false}/>
                                <Line yAxisId="left" type="monotone" dataKey="slRoi" name="ROI Min" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} />
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
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Clicks</TableHead>
                                <TableHead className="text-right">Spends</TableHead>
                                <TableHead className="text-right">Budget</TableHead>
                                <TableHead className="text-right">Budget Utilisation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dailyTotals.map((day, index) => {
                                const deliveredROI = day.spend > 0 ? day.gmv / day.spend : 0;
                                const budgetUtilisation = form.getValues('dailyBudget') > 0 ? day.spend / form.getValues('dailyBudget') : 0;
                                const avgTargetROI = day.totalClicksForWeight > 0 ? day.weightedTargetROI / day.totalClicksForWeight : 0;
                                return (
                                    <TableRow key={`day-total-${index}`}>
                                        <TableCell>Day {day.day}</TableCell>
                                        <TableCell className="text-right">{formatRoi(deliveredROI)}</TableCell>
                                        <TableCell className="text-right">{formatRoi(avgTargetROI)}</TableCell>
                                        <TableCell className="text-right">{day.orders.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{day.clicks.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(day.spend)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(form.getValues('dailyBudget'))}</TableCell>
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
         {!isLoading && (!results || results.length === 0) && (
            <div className="flex items-center justify-center h-full min-h-[60vh] bg-card rounded-lg border shadow-lg">
                <div className="text-center text-muted-foreground p-8">
                    <Cog className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Ready to run the multi-day simulation?</h3>
                    <p>Configure your algorithm parameters and click "Run" to begin.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

    
    