"use client";

import type { UseFormReturn, SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export const formSchema = z.object({
  roi1: z.coerce.number().positive({ message: "Must be positive" }),
  roi2: z.coerce.number().positive({ message: "Must be positive" }),
  roi3: z.coerce.number().positive({ message: "Must be positive" }),
  roi4: z.coerce.number().positive({ message: "Must be positive" }),
});

export type ROIFormValues = z.infer<typeof formSchema>;

interface ROIInputFormProps {
  form: UseFormReturn<ROIFormValues>;
  onSubmit: SubmitHandler<ROIFormValues>;
  isLoading: boolean;
}

export default function ROIInputForm({ form, onSubmit, isLoading }: ROIInputFormProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Define ROI Targets</CardTitle>
        <CardDescription>Enter your target ROI for each 6-hour window. This should be a multiplier (e.g., 5 for 5x ROI).</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roi1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target 1 (0-6h)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input type="number" placeholder="4" {...field} />
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
                            <Input type="number" placeholder="8" {...field} />
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
                            <Input type="number" placeholder="3" {...field} />
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
                            <Input type="number" placeholder="6" {...field} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Simulating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Run Simulation </>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
