import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SimulationWindowResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ResultsTableProps {
  results: SimulationWindowResult[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

export default function ResultsTable({ results }: ResultsTableProps) {
  const headers = [
    'Metric',
    ...results.map(r => r.name)
  ];

  const rows = [
    { label: 'Input ROI Target', key: 'targetROI', format: (v: number) => `${v}x` },
    { label: 'Avg. Calculated Bid', key: 'avgBid', format: formatCurrency },
    { label: 'Avg. pCVR', key: 'avgPCVR', format: formatPercentage },
    { label: 'Total Clicks', key: 'totalClicks', format: (v: number) => v.toLocaleString() },
    { label: 'Total Orders', key: 'totalOrders', format: (v: number) => v.toLocaleString() },
    { label: 'Orders/Clicks', key: 'ordersToClicksRatio', format: formatPercentage },
    { label: 'Total Ad Spend', key: 'totalSpend', format: formatCurrency },
    { label: 'Total Revenue', key: 'totalRevenue', format: formatCurrency },
    { label: 'Delivered ROI', key: 'deliveredROI', format: (v: number) => `${v.toFixed(2)}x`, isHighlight: true },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Simulation Results by Window</CardTitle>
        <CardDescription>Comparative performance for each 6-hour period.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => <TableHead key={header} className={header !== 'Metric' ? 'text-right' : ''}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.label} className={cn(row.isHighlight ? 'bg-accent/20' : '')}>
                  <TableCell className="font-medium whitespace-nowrap">{row.label}</TableCell>
                  {results.map(windowResult => (
                    <TableCell key={`${row.label}-${windowResult.name}`} className={cn('text-right tabular-nums whitespace-nowrap', row.isHighlight ? 'font-bold text-accent' : '')}>
                      {row.format(windowResult[row.key as keyof SimulationWindowResult] as number)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
