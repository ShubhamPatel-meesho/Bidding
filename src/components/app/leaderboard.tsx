'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trophy, Percent, Repeat } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onSelect: (entry: LeaderboardEntry) => void;
}

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatROI = (value: number) => `${value.toFixed(2)}x`;

export default function Leaderboard({ entries, onSelect }: LeaderboardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-amber-500" />
          Leaderboard
        </CardTitle>
        <CardDescription>Top 10 successful simulation runs. Click to re-run.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Final ROI</TableHead>
              <TableHead className="text-right">Budget Use</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={entry.id} className={cn(index === 0 && "bg-amber-100/50")}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {index + 1}
                    {index < 3 && <Trophy className={cn("w-4 h-4", 
                      index === 0 && "text-amber-500",
                      index === 1 && "text-slate-400",
                      index === 2 && "text-amber-700"
                    )} />}
                  </div>
                </TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatROI(entry.finalDeliveredROI)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercentage(entry.budgetUtilisation)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onSelect(entry)}>
                    <Repeat className="mr-2 h-4 w-4" />
                    Load
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
