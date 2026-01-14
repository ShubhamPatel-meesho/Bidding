
'use client';

import Header from '@/components/app/header';
import ROISimulator from '@/components/app/roi-simulator';
import Leaderboard from '@/components/app/leaderboard';
import MultiDaySimulator from '@/components/app/multi-day-simulator';
import { Sidebar, SidebarProvider, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import { useState } from 'react';
import { LayoutGrid, BarChart, Trophy } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { LeaderboardEntry } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

type ActiveView = 'simulator' | 'leaderboard' | 'catalog';

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>('catalog');
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('leaderboard', []);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  const { toast } = useToast();

  const handleLeaderboardDelete = (id: string) => {
    setLeaderboard(leaderboard.filter(entry => entry.id !== id));
    toast({
      title: 'Entry Deleted',
      description: `The entry has been removed from the leaderboard.`,
    });
  };

  const handleLeaderboardSelect = (entry: LeaderboardEntry) => {
    setSelectedEntry(entry);
    setActiveView('simulator');
    toast({
      title: 'Loading Strategy...',
      description: `"${entry.name}" parameters have been loaded into the form.`,
    });
  };

  const handleEntryProcessed = () => {
    setSelectedEntry(null);
  }


  const renderContent = () => {
    switch (activeView) {
      case 'simulator':
        return <ROISimulator 
                  setLeaderboard={setLeaderboard} 
                  leaderboard={leaderboard}
                  selectedEntry={selectedEntry}
                  onEntryProcessed={handleEntryProcessed}
                />;
      case 'leaderboard':
        return <Leaderboard entries={leaderboard} onSelect={handleLeaderboardSelect} onDelete={handleLeaderboardDelete} />;
      case 'catalog':
        return <MultiDaySimulator />;
      default:
        return <ROISimulator 
                  setLeaderboard={setLeaderboard} 
                  leaderboard={leaderboard}
                  selectedEntry={selectedEntry}
                  onEntryProcessed={handleEntryProcessed}
                />;
    }
  }

  return (
    <SidebarProvider>
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarMenu className="flex-1">
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
          <SidebarFooter>
              <SidebarTrigger />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <div className="min-h-screen flex flex-col bg-background text-foreground w-full">
                <div className="flex items-center gap-4 border-b p-4">
                  <Header />
                </div>
                <div className="p-4 sm:p-8 md:p-12 w-full max-w-7xl mx-auto flex-1">
                    <main className="mt-8">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
