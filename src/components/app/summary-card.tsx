import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SimulationSummary } from '@/lib/types';
import { ArrowUp, ShoppingCart, IndianRupee, MousePointerClick, Percent, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SummaryCardProps {
  summary: SimulationSummary;
  failureReason: string | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

const SummaryItem = ({ 
  icon: Icon, 
  label, 
  value, 
  valueClassName,
  tooltipContent 
}: { 
  icon: React.ElementType, 
  label: string, 
  value: string, 
  valueClassName?: string,
  tooltipContent?: React.ReactNode
}) => {
  const content = (
    <div className="flex items-center justify-between p-4 rounded-lg bg-background">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-accent/20 rounded-md">
                <Icon className="w-6 h-6 text-accent" />
            </div>
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className={cn("font-semibold text-lg tabular-nums", valueClassName)}>{value}</span>
    </div>
  );

  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content;
}

export default function SummaryCard({ summary, failureReason }: SummaryCardProps) {
  const isBudgetExhaustedEarly = summary.spentAllBudget;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>24-Hour Performance Summary</CardTitle>
        <CardDescription>An overview of the total performance across all time windows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryItem icon={MousePointerClick} label="Total Clicks" value={summary.totalClicks.toLocaleString()} />
            <SummaryItem icon={ShoppingCart} label="Total Orders" value={summary.totalOrders.toLocaleString()} />
            <SummaryItem icon={IndianRupee} label="Total Ad Spend" value={formatCurrency(summary.totalSpend)} />
            <SummaryItem 
              icon={isBudgetExhaustedEarly ? Info : Percent}
              label="Budget Utilisation" 
              value={formatPercentage(summary.budgetUtilisation)}
              valueClassName={isBudgetExhaustedEarly ? 'text-destructive' : ''}
              tooltipContent={isBudgetExhaustedEarly ? (
                  <p className="max-w-xs">Budget exhausted before the day ended, missing potential ROI in later hours.</p>
              ) : undefined}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryItem icon={IndianRupee} label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        </div>

        {failureReason && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Simulation Failed</AlertTitle>
            <AlertDescription>
              {failureReason}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-lg bg-primary text-primary-foreground shadow-xl">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-foreground/20 rounded-lg">
                    <ArrowUp className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                    <h4 className="text-lg font-semibold">Final Delivered ROI</h4>
                    <p className="text-sm text-primary-foreground/80">Weighted average for the 24-hour period.</p>
                </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">
                {summary.finalDeliveredROI.toFixed(2)}x
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
