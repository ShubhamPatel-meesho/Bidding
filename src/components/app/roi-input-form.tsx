"use client";

import type { UseFormReturn, SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, IndianRupee, BrainCircuit, Trophy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  aov: z.coerce.number().positive({ message: "Must be positive" }),
  budget: z.coerce.number().positive({ message: "Must be positive" }),
  roi1: z.coerce.number().positive({ message: "Must be positive" }),
  roi2: z.coerce.number().positive({ message: "Must be positive" }),
  roi3: z.coerce.number().positive({ message: "Must be positive" }),
  roi4: z.coerce.number().positive({ message: "Must be positive" }),
});

export type ROIFormValues = z.infer<typeof formSchema>;

interface ROIInputFormProps {
  form: UseFormReturn<ROIFormValues>;
  onSubmit: SubmitHandler<ROIFormValues>;
  onOptimize: () => void;
  isLoading: boolean;
  isOptimizing: boolean;
}

export default function ROIInputForm({ form, onSubmit, onOptimize, isLoading, isOptimizing }: ROIInputFormProps) {
  const isButtonDisabled = isLoading || isOptimizing;
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Define Simulation Parameters</CardTitle>
        <CardDescription>Enter your Average Order Value (AOV), budget, and target ROI for each 6-hour window.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-secondary rounded-lg text-center">
            <h4 className="text-sm font-medium text-secondary-foreground">Seller-Asked ROI (Guideline)</h4>
            <p className="text-2xl font-bold text-primary">5x</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Simulator Name</FormLabel>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aov"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Average Order Value (AOV)</FormLabel>
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
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Ads Budget</FormLabel>
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roi1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target 1 (0-6h)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder="15" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roi2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target 2 (6-12h)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder="15" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roi3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target 3 (12-18h)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder="15" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roi4"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target 4 (18-24h)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder="15" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isButtonDisabled}>
              {isLoading ? 'Simulating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Run Simulation </>}
            </Button>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
             <Button type="button" variant="outline" className="w-full" onClick={onOptimize} disabled={isButtonDisabled}>
                {isOptimizing ? 'Optimizing...' : <> <BrainCircuit className="mr-2 h-4 w-4" /> Find Optimal ROI</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
