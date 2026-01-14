import { Target } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex flex-col items-start text-left">
      <div className="flex items-center gap-4">
        <Target className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">
          Bidding Simulator
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Deliver the maximum ROI, while spending the whole budget.
      </p>
    </header>
  );
}
