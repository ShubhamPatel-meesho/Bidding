import Header from '@/components/app/header';
import ROISimulator from '@/components/app/roi-simulator';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 md:p-12 bg-background text-foreground">
      <div className="w-full max-w-7xl mx-auto">
        <Header />
        <main className="mt-8">
          <ROISimulator />
        </main>
      </div>
    </div>
  );
}
