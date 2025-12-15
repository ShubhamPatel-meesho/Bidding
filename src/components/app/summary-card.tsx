import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SimulationSummary } from '@/lib/types';
import { ArrowUp, ShoppingCart, IndianRupee, MousePointerClick } from 'lucide-react';

interface SummaryCardProps {
  summary: SimulationSummary;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const SummaryItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-background">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-accent/20 rounded-md">
                <Icon className="w-6 h-6 text-accent" />
            </div>
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold text-lg tabular-nums">{value}</span>
    </div>
)

export default function SummaryCard({ summary }: SummaryCardProps) {
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
            <SummaryItem icon={IndianRupee} label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        </div>
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
                {summary.finalDeliveredROI.toFixed(0)}%
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
