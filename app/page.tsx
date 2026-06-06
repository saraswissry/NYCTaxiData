'use client'
// ghahagssg
import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { TopControlBar } from '@/components/top-control-bar'
import { CommandMap } from '@/components/command-map'
import { AnalyticsPanel } from '@/components/analytics-panel'
import { StatusBar } from '@/components/status-bar'
import { AuthGuard } from '@/components/auth-guard'

export default function CommandCenterPage() {
  const [selectedZone, setSelectedZone] = React.useState<any | null>(null)
  const [viewMode, setViewMode] = React.useState('realtime')
  
  // Layer States
  const [showDemand, setShowDemand] = React.useState(true)
  const [showFleet, setShowFleet] = React.useState(true) // Start with live active fleet visible for amazing visuals!
  const [showGap, setShowGap] = React.useState(false)

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-background text-foreground theme-transition">
        {/* Top Control Bar with multi-layer overlays and mechanical theme slider */}
        <TopControlBar 
          viewMode={viewMode} 
          onViewModeChange={setViewMode}
          showDemand={showDemand}
          onShowDemandChange={setShowDemand}
          showFleet={showFleet}
          onShowFleetChange={setShowFleet}
          showGap={showGap}
          onShowGapChange={(val) => {
            setShowGap(val)
            if (val) {
              // Gap and Demand both fill the hexagons, so let Gap take visual override precedence
              setShowDemand(false)
            } else {
              setShowDemand(true)
            }
          }}
        />
        
        {/* Main Content Area - 3D Map + Persistent Side Analytical Dock */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Area - occupies 75% width */}
          <div className="flex-[3] relative min-w-0 p-4 bg-background theme-transition">
            <CommandMap 
              viewMode={viewMode} 
              showDemand={showDemand}
              showFleet={showFleet}
              showGap={showGap}
              onSelectZone={setSelectedZone}
            />
          </div>
          
          {/* Analytics Side Panel - occupies 25% width (floating glassmorphic style) */}
          <div className="flex-1 max-w-[384px] h-full p-4 pl-0 bg-background theme-transition">
            <AnalyticsPanel 
              zone={selectedZone} 
              onClose={() => setSelectedZone(null)} 
            />
          </div>
        </div>
        
        {/* Bottom Status Bar with scrolling logs marquee */}
        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
