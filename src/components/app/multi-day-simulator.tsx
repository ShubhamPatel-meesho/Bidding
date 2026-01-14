
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, IndianRupee, Target, Percent, Cog } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formSchema = z.object({
  slRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialTargetRoi: z.coerce.number().positive({ message: "Must be positive" }),
  initialDeliveredRoi: z.coerce.number().positive({ message: "Must be positive" }),
  dailyBudget: z.coerce.number().positive({ message: "Must be positive" }),
  pacingP: z.coerce.number().min(0),
  pacingI: z.coerce.number().min(0),
  pacingD: z.coerce.number().min(0),
});

type MultiDayFormValues = z.infer<typeof formSchema>;

export default function MultiDaySimulator() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const form = useForm<MultiDayFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slRoi: 20, // Service Level ROI
      initialTargetRoi: 15,
      initialDeliveredRoi: 20,
      dailyBudget: 300,
      pacingP: 0.2,
      pacingI: 0,
      pacingD: 0,
    },
  });

  const runAndProcessSimulation: SubmitHandler<MultiDayFormValues> = async (data) => {
    setIsLoading(true);
    setResults(null);

    // Basic 2-day simulation stub
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
    const stubResults = [
        { day: 'Day 1', deliveredROI: 19.5, targetROI: 15.0, orders: 10, spend: 290, budgetUtilization: 0.97 },
        { day: 'Day 2', deliveredROI: 19.8, targetROI: 15.2, orders: 11, spend: 295, budgetUtilization: 0.98 },
    ];
    
    setResults(stubResults);
    setIsLoading(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 flex flex-col gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Multi-Day Bidding Algorithm</CardTitle>
            <CardDescription>Configure the parameters for the ROI Pacing controller.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(runAndProcessSimulation)} className="space-y-6">
                <FormField
                  control={form.control} name="slRoi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Level ROI (SL ROI)</FormLabel>
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
                  control={form.control} name="dailyBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Catalog Budget</FormLabel>
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
                  control={form.control} name="initialTargetRoi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Target ROI</FormLabel>
                       <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2"><Cog className="w-4 h-4" /> ROI Pacing PID</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 pt-2">
                        <FormField
                        control={form.control} name="pacingP"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>P</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control} name="pacingI"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>I</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control} name="pacingD"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>D</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Simulating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Run 30-Day Simulation </>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        {isLoading && (
            <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Running 30-day simulation...</p>
                </div>
            </div>
        )}
        {results && !isLoading && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>30-Day Performance</CardTitle>
                    <CardDescription>Day-over-day performance of the bidding algorithm.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <RechartsBarChart data={results} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                                <Legend />
                                <Bar dataKey="deliveredROI" name="Delivered ROI" fill="hsl(var(--primary))" />
                                <Bar dataKey="targetROI" name="Target ROI" fill="hsl(var(--primary) / 0.5)" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Daily Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Detailed daily results will be shown here.</p>
                </CardContent>
            </Card>
          </div>
        )}
         {!isLoading && !results && (
            <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
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
