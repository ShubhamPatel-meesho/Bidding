
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TooltipProps } from 'recharts';

const formatValue = (value: any): string => {
    if (typeof value === 'number') {
        return value.toFixed(2);
    }
    return String(value);
}

export const CustomChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const items = [
      { name: 'Catalog GMV', value: data.dayCumulativeGmv, color: 'hsl(var(--chart-2))' },
      { name: 'Day ROI', value: data.dayROI, color: 'hsl(var(--chart-1))' },
      { name: 'Daily Clicks', value: data.dayCumulativeClicks, color: 'hsl(var(--chart-3))' },
      { name: 'Catalog ROI', value: data.deliveredROI, color: 'hsl(var(--chart-4))' },
      { name: 'ROI Target', value: data.targetROI, color: 'hsl(var(--chart-5))' },
      { name: 'ROI Min', value: data.slRoi, color: 'hsl(var(--primary))' },
      { name: 'Average Bid', value: data.avgBid, color: 'hsl(var(--foreground))' },
    ];
    
    return (
      <Card className="p-4 shadow-lg bg-background/90 backdrop-blur-sm">
        <p className="font-bold mb-2">Day {data.day}, Interval {data.timestamp}</p>
        <div className="space-y-1">
            {items.map(item => (
                 <div key={item.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{formatValue(item.value)}</p>
                </div>
            ))}
        </div>
      </Card>
    );
  }

  return null;
};
