'use client';

import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SimulationWindowResult } from '@/lib/types';

interface ResultsChartProps {
  results: SimulationWindowResult[];
}

const formatCurrencyForAxis = (value: number) => {
    if (value >= 100000) {
        return `${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
}

export default function ResultsChart({ results }: ResultsChartProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Performance Metrics by Window</CardTitle>
        <CardDescription>Visual comparison of Target ROI vs. Delivered ROI and Total Revenue.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={results} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" label={{ value: 'ROI (x)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--primary))' } }} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" tickFormatter={formatCurrencyForAxis} label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle', fill: 'hsl(var(--accent))' } }} />
              <Tooltip 
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))'
                }}
                formatter={(value, name) => {
                    if (name === 'Total Revenue') return [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value as number), name];
                    return [`${(value as number).toFixed(2)}x`, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="targetROI" name="Target ROI" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="deliveredROI" name="Delivered ROI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
