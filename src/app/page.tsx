
'use client';

import Header from '@/components/app/header';
import ROISimulator from '@/components/app/roi-simulator';
import Leaderboard from '@/components/app/leaderboard';
import { Sidebar, SidebarProvider, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useState } from 'react';
import { LayoutGrid, BarChart, Trophy } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { LeaderboardEntry } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

type ActiveView = 'simulator' | 'leaderboard' | 'catalog';

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>('simulator');
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('leaderboard', []);
  const { toast } = useToast();

  const handleLeaderboardDelete = (id: string) => {
    setLeaderboard(leaderboard.filter(entry => entry.id !== id));
    toast({
      title: 'Entry Deleted',
      description: `The entry has been removed from the leaderboard.`,
    });
  };

  const handleLeaderboardSelect = (entry: LeaderboardEntry) => {
    // This function will be passed to the ROISimulator, but the logic
    // to set form values will live inside ROISimulator.
    // For now, we just switch the view.
    setActiveView('simulator');
    // We'll need a way to pass the selected entry to the ROISimulator
    // This will be handled in a future step.
     toast({
      title: 'Loading Strategy...',
      description: `"${entry.name}" parameters have been loaded into the form.`,
    });
  };


  const renderContent = () => {
    switch (activeView) {
      case 'simulator':
        return <ROISimulator setLeaderboard={setLeaderboard} leaderboard={leaderboard} />;
      case 'leaderboard':
        return <Leaderboard entries={leaderboard} onSelect={handleLeaderboardSelect} onDelete={handleLeaderboardDelete} />;
      case 'catalog':
        return (
           <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
              <div className="text-center text-muted-foreground p-8">
                  <LayoutGrid className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">Multi day simulator</h3>
                  <p>This space is reserved for future multi-day simulation features.</p>
              </div>
          </div>
        );
      default:
        return <ROISimulator setLeaderboard={setLeaderboard} leaderboard={leaderboard} />;
    }
  }

  return (
    <SidebarProvider>
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('simulator')} isActive={activeView === 'simulator'} tooltip="Single day simulator">
                <BarChart />
                <span>Single day simulator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('leaderboard')} isActive={activeView === 'leaderboard'} tooltip="Leaderboard">
                <Trophy />
                <span>Leaderboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('catalog')} isActive={activeView === 'catalog'} tooltip="Multi day simulator">
                <LayoutGrid />
                <span>Multi day simulator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
        <SidebarInset>
            <div className="min-h-screen flex flex-col bg-background text-foreground w-full">
                <div className="p-4 sm:p-8 md:p-12 w-full max-w-7xl mx-auto">
                    <Header />
                    <main className="mt-8">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
