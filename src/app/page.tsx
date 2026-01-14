
'use client';

import Header from '@/components/app/header';
import ROISimulator from '@/components/app/roi-simulator';
import Leaderboard from '@/components/app/leaderboard';
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
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

  const renderContent = () => {
    switch (activeView) {
      case 'simulator':
        return <ROISimulator setLeaderboard={setLeaderboard} leaderboard={leaderboard} />;
      case 'leaderboard':
        return <Leaderboard entries={leaderboard} onSelect={() => {}} onDelete={handleLeaderboardDelete} />;
      case 'catalog':
        return (
           <div className="flex items-center justify-center h-full min-h-[500px] bg-card rounded-lg border shadow-lg">
              <div className="text-center text-muted-foreground p-8">
                  <LayoutGrid className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">Catalog Level Simulator</h3>
                  <p>This space is reserved for future catalog-level simulation features.</p>
              </div>
          </div>
        );
      default:
        return <ROISimulator setLeaderboard={setLeaderboard} leaderboard={leaderboard} />;
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('simulator')} isActive={activeView === 'simulator'} tooltip="Bidding Simulator">
                <BarChart />
                <span>Bidding Simulator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('leaderboard')} isActive={activeView === 'leaderboard'} tooltip="Leaderboard">
                <Trophy />
                <span>Leaderboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveView('catalog')} isActive={activeView === 'catalog'} tooltip="Catalog Level Simulator">
                <LayoutGrid />
                <span>Catalog Simulator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
        <SidebarInset>
            <div className="p-4 sm:p-8 md:p-12 w-full max-w-7xl mx-auto">
                <Header />
                <main className="mt-8">
                    {renderContent()}
                </main>
            </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
