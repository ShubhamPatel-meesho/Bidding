'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OptimizationIteration } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizationLogProps {
  log: OptimizationIteration[];
}

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatROI = (value: number) => `${value.toFixed(2)}x`;
const formatROIList = (values: number[]) => values.map(v => v.toFixed(1)).join(' | ');

export default function OptimizationLog({ log }: OptimizationLogProps) {
  const bestIteration = log.reduce((best, current) => current.isBest ? current.iteration : best, 0);

  return (
    <ScrollArea className="h-[60vh] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/50">
          <TableRow>
            <TableHead className="w-20 text-center">Iteration</TableHead>
            <TableHead>ROI Targets (0-6h | 6-12h | 12-18h | 18-24h)</TableHead>
            <TableHead className="text-right">Budget Use</TableHead>
            <TableHead className="text-right">Delivered ROI</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {log.map((item) => (
            <TableRow key={item.iteration} className={cn(item.isBest && 'bg-primary/10 hover:bg-primary/10')}>
              <TableCell className="text-center font-medium">
                <div className="flex items-center justify-center gap-2">
                  {item.iteration}
                  {item.isBest && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{formatROIList(item.roiTargets)}</TableCell>
              <TableCell className={cn(
                  "text-right tabular-nums",
                  item.budgetUtilization > 1.0 && 'text-destructive',
                  item.budgetUtilization < 0.9 && 'text-amber-600',
              )}>
                {formatPercentage(item.budgetUtilization)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{formatROI(item.deliveredROI)}</TableCell>
              <TableCell className="text-right tabular-nums">{item.score.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
