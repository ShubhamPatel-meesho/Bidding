'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trophy, Repeat, Trash2, ShoppingCart } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onSelect: (entry: LeaderboardEntry) => void;
  onDelete: (id: string) => void;
}

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatROI = (value: number) => `${value.toFixed(2)}x`;

export default function Leaderboard({
  entries,
  onSelect,
  onDelete,
}: LeaderboardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-amber-500" />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Top 10 successful simulation runs. Click to re-run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Final ROI</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Budget Use</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow
                key={entry.id}
                className={cn(index === 0 && 'bg-amber-100/50')}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {index + 1}
                    {index < 3 && (
                      <Trophy
                        className={cn(
                          'w-4 h-4',
                          index === 0 && 'text-amber-500',
                          index === 1 && 'text-slate-400',
                          index === 2 && 'text-amber-700'
                        )}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatROI(entry.finalDeliveredROI)}
                </TableCell>
                 <TableCell className="text-right tabular-nums">
                  {entry.totalOrders?.toLocaleString() ?? 'N/A'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercentage(entry.budgetUtilisation)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(entry)}
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    Load
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className='h-9 w-9'>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the "{entry.name}" run from the leaderboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
