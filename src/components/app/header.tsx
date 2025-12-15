import { Target } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="flex items-center gap-4">
        <Target className="w-12 h-12 text-primary" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary font-headline">
          Bidding Simulator
        </h1>
      </div>
      <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
        Deliver the maximum ROI, while spending the whole budget.
      </p>
    </header>
  );
}
