
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TooltipProps } from 'recharts';

const formatValue = (value: any): string => {
    if (typeof value === 'number') {
        // Use toLocaleString for numbers to handle formatting and avoid excessive decimals
        if (Math.abs(value) < 1 && value !== 0) {
            return value.toFixed(4); // For small decimals like pCVR
        }
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;


export const CustomChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const items = [
      { name: 'Active Module', value: data.activeModule, color: 'hsl(var(--foreground))' },
      { name: 'Catalog GMV', value: formatCurrency(data.dayCumulativeGmv), color: 'hsl(var(--chart-2))' },
      { name: 'Day ROI', value: `${formatValue(data.dayROI)}x`, color: 'hsl(var(--chart-1))' },
      { name: 'Daily Clicks', value: data.dayCumulativeClicks?.toLocaleString(), color: 'hsl(var(--chart-3))' },
      { name: 'Catalog ROI', value: `${formatValue(data.deliveredROI)}x`, color: 'hsl(var(--chart-4))' },
      { name: 'ROI Target', value: `${formatValue(data.targetROI)}x`, color: 'hsl(var(--chart-5))' },
      { name: 'ROI Min', value: `${formatValue(data.slRoi)}x`, color: 'hsl(var(--primary))' },
      { name: 'Average Bid', value: formatCurrency(data.avgBid), color: 'hsl(var(--foreground))' },
      { name: 'pCVR', value: formatValue(data.pCvr), color: 'hsl(var(--secondary-foreground))' },
      { name: 'Daily Spend', value: formatCurrency(data.dayCumulativeSpend), color: 'hsl(var(--destructive))' },
      { name: 'Budget Utilisation', value: formatPercent(data.dayBudgetUtilisation), color: 'hsl(var(--accent))' },
      { name: 'Ideal Utilisation', value: formatPercent(data.idealBudgetUtilisation), color: 'hsl(var(--accent))' },
    ];
    
    return (
      <Card className="p-4 shadow-lg bg-background/90 backdrop-blur-sm w-64">
        <p className="font-bold mb-2">Day {data.day}, Interval {data.timestamp % 48}</p>
        <div className="space-y-1">
            {items.map(item => (
                 <div key={item.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{item.value}</p>
                </div>
            ))}
        </div>
      </Card>
    );
  }

  return null;
};
