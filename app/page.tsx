'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandMap } from '@/components/command-map'
import { StatusBar } from '@/components/status-bar'
import { AuthGuard } from '@/components/auth-guard'
import { fleetApi } from '@/lib/fleet-api'
import { getToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Play,
  Pause,
  Square,
  Zap,
  Loader2,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import * as signalR from '@microsoft/signalr'

export default function CommandCenterPage() {
  const [selectedZone, setSelectedZone] = React.useState<any | null>(null)
  const [viewMode, setViewMode] = React.useState('simulation') // default to simulation
  
  // Layer States
  const [showDemand, setShowDemand] = React.useState(true)
  const [showFleet, setShowFleet] = React.useState(true)
  const [showGap, setShowGap] = React.useState(false)

  // Panel visibility & lock state
  const [panelVisible, setPanelVisible] = React.useState(true)
  const [isConfigSet, setIsConfigSet] = React.useState(false)

  // Simulation states
  const [cachedZones, setCachedZones] = React.useState<any[]>([])
  const [latestTick, setLatestTick] = React.useState<any | null>(null)
  const [isSimActive, setIsSimActive] = React.useState(false)
  const [isSimPaused, setIsSimPaused] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  // Form params
  const [durationHours, setDurationHours] = React.useState(24)
  const [speedFactor, setSpeedFactor] = React.useState(20)
  const [totalDrivers, setTotalDrivers] = React.useState(300)
  const [zoneCount, setZoneCount] = React.useState(80)
  const [startTime, setStartTime] = React.useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })

  // Load and cache zones on mount
  React.useEffect(() => {
    const loadZones = async () => {
      try {
        const zones = await fleetApi.zones.getAll()
        setCachedZones(zones || [])
      } catch (err) {
        console.error('Failed to load zones on page mount:', err)
      }
    }
    loadZones()
  }, [])

  // Establish SignalR connection to SimulationHub
  React.useEffect(() => {
    let connection: signalR.HubConnection | null = null

    const connectHub = async () => {
      connection = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/simulation', {
          accessTokenFactory: () => getToken() ?? ''
        })
        .withAutomaticReconnect()
        .build()

      connection.on('SimulationTick', (tick: any) => {
        setLatestTick(tick)
      })

      connection.on('SimulationStatus', (status: any) => {
        setIsSimActive(status.status === 'Running' || status.status === 1 || status.status === 'Paused')
        setIsSimPaused(status.isPaused || status.status === 'Paused')
      })

      try {
        await connection.start()
        console.log('Simulation SignalR Hub Connected! 🎮')
        
        // Fetch current status on connection via REST API
        const status = await fleetApi.simulation.getStatus()
        if (status) {
          setIsSimActive(status.status === 'Running' || status.status === 1 || status.status === 'Paused')
          setIsSimPaused(status.isPaused || status.status === 'Paused')
        }
      } catch (err) {
        console.error('Simulation Hub connection error:', err)
      }
    }

    connectHub()

    return () => {
      if (connection) {
        connection.stop()
      }
    }
  }, [])

  const handleStartSimulation = async () => {
    try {
      setLoading(true)
      setIsConfigSet(true)
      await fleetApi.simulation.start({
        durationHours,
        speedFactor,
        totalDrivers,
        zoneCount,
        startTime
      })
      toast.success('Simulation started successfully! 🚀')
    } catch (err: any) {
      console.error('Failed to start simulation:', err)
      toast.error(err?.message || 'Failed to start simulation.')
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSimulation = async () => {
    try {
      await fleetApi.simulation.pause()
      setIsSimPaused(true)
      toast.info('Simulation paused. ⏸')
    } catch (err) {
      console.error('Failed to pause simulation:', err)
      toast.error('Failed to pause simulation.')
    }
  }

  const handleResumeSimulation = async () => {
    try {
      await fleetApi.simulation.resume()
      setIsSimPaused(false)
      toast.success('Simulation resumed. ▶')
    } catch (err) {
      console.error('Failed to resume simulation:', err)
      toast.error('Failed to resume simulation.')
    }
  }

  const handleStopSimulation = async () => {
    try {
      await fleetApi.simulation.stop()
      setIsSimActive(false)
      setIsSimPaused(false)
      setLatestTick(null)
      setIsConfigSet(false)
      toast.warning('Simulation aborted. ⏹')
    } catch (err) {
      console.error('Failed to stop simulation:', err)
      toast.error('Failed to stop simulation.')
    }
  }

  const handleSetConfiguration = () => {
    setIsConfigSet(true)
    toast.success('Simulation parameters locked and set! 🔒')
  }

  const handleResetConfiguration = () => {
    setIsConfigSet(false)
    toast.info('Parameters unlocked. 🔓')
  }

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen overflow-hidden bg-background text-foreground theme-transition animate-fade-in">
          
          {/* Main Layout Area */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Map Area */}
            <div className="flex-1 relative min-w-0 bg-background theme-transition">
              <CommandMap 
                viewMode={viewMode} 
                showDemand={showDemand}
                showFleet={showFleet}
                showGap={showGap}
                onSelectZone={setSelectedZone}
                simulationData={latestTick?.zones}
                cachedZones={cachedZones}
              />

              {/* Floating button to re-open the panel if it is hidden */}
              {!panelVisible && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPanelVisible(true)}
                  className="absolute top-5 right-5 z-30 size-9 rounded-lg bg-card/85 border-border text-foreground hover:bg-muted shadow-lg backdrop-blur-md transition-all duration-300"
                >
                  <ChevronLeft className="size-4 text-primary" />
                </Button>
              )}
            </div>

            {/* Simulation Controller Panel Pinned to the Right */}
            {panelVisible && (
              <div className="w-[340px] h-full border-l border-border bg-card/85 backdrop-blur-xl p-5 flex flex-col gap-4 text-foreground select-none relative shrink-0 overflow-y-auto theme-transition shadow-2xl transition-all duration-300">
                {/* Collapse button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPanelVisible(false)}
                  className="absolute right-4 top-4 size-8 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ChevronRight className="size-4" />
                </Button>

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-border pb-3 pr-8">
                  <Sparkles className="size-5 text-[#EAB308] animate-pulse" />
                  <div>
                    <h3 className="text-sm font-mono font-black uppercase tracking-wider text-foreground">Simulation Cockpit</h3>
                    <p className="text-[10px] text-muted-foreground">Setup & playback control engine</p>
                  </div>
                </div>

                {/* Setup Controls (disabled when locked) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EAB308]">Parameters</span>
                    <Badge variant="outline" className={isConfigSet ? "bg-success/10 text-success border-success/30 font-mono text-[9px]" : "bg-warning/10 text-warning border-warning/30 font-mono text-[9px]"}>
                      {isConfigSet ? "CONFIG LOCKED" : "SETUP MODE"}
                    </Badge>
                  </div>

                  <div className="space-y-3.5 text-xs bg-muted/30 border border-border p-3.5 rounded-xl">
                    {/* Duration Hours */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <Label className="text-muted-foreground">Duration</Label>
                        <span className="text-foreground font-black">{durationHours} Hours</span>
                      </div>
                      <Slider
                        value={[durationHours]}
                        min={1}
                        max={72}
                        step={1}
                        onValueChange={(val) => setDurationHours(val[0])}
                        disabled={isConfigSet}
                        className="py-1"
                      />
                    </div>

                    {/* Speed Factor */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <Label className="text-muted-foreground">Speed Factor</Label>
                        <span className="text-foreground font-black">{speedFactor}x</span>
                      </div>
                      <Slider
                        value={[speedFactor]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={(val) => setSpeedFactor(val[0])}
                        disabled={isConfigSet}
                        className="py-1"
                      />
                    </div>

                    {/* Driver Capacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <Label className="text-muted-foreground">Driver Count</Label>
                        <span className="text-foreground font-black">{totalDrivers} cabs</span>
                      </div>
                      <Slider
                        value={[totalDrivers]}
                        min={10}
                        max={1000}
                        step={10}
                        onValueChange={(val) => setTotalDrivers(val[0])}
                        disabled={isConfigSet}
                        className="py-1"
                      />
                    </div>

                    {/* Zone Count */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <Label className="text-muted-foreground">Hotspot Sectors</Label>
                        <span className="text-foreground font-black">{zoneCount} zones</span>
                      </div>
                      <Slider
                        value={[zoneCount]}
                        min={5}
                        max={265}
                        step={5}
                        onValueChange={(val) => setZoneCount(val[0])}
                        disabled={isConfigSet}
                        className="py-1"
                      />
                    </div>

                    {/* Start Time */}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-[10px]">Start Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={isConfigSet}
                        className="h-8 bg-background border-border text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Media Control Toolbar (SET, RUN, PAUSE, STOP) */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EAB308]">Control Panel</div>
                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-muted/40 border border-border rounded-xl">
                    {/* SET BUTTON */}
                    <Button
                      variant={isConfigSet ? "secondary" : "default"}
                      size="sm"
                      disabled={isSimActive}
                      onClick={isConfigSet ? handleResetConfiguration : handleSetConfiguration}
                      className="h-9 p-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold shrink-0"
                      title={isConfigSet ? "Unlock config" : "Lock config"}
                    >
                      <Settings className="size-3.5" />
                      {isConfigSet ? "Unlock" : "Set"}
                    </Button>

                    {/* RUN BUTTON */}
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isSimActive || loading}
                      onClick={handleStartSimulation}
                      className="h-9 p-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold bg-[#EAB308] hover:bg-[#CA8A04] text-slate-950 shrink-0 glow-amber"
                    >
                      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                      Run
                    </Button>

                    {/* PAUSE / RESUME BUTTON */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isSimActive}
                      onClick={isSimPaused ? handleResumeSimulation : handlePauseSimulation}
                      className="h-9 p-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold border-border shrink-0"
                    >
                      {isSimPaused ? <Play className="size-3.5 text-success animate-pulse" /> : <Pause className="size-3.5 text-warning" />}
                      {isSimPaused ? "Resume" : "Pause"}
                    </Button>

                    {/* STOP BUTTON */}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!isSimActive && !isConfigSet}
                      onClick={handleStopSimulation}
                      className="h-9 p-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-mono font-bold shrink-0 font-black"
                    >
                      <Square className="size-3.5" />
                      Stop
                    </Button>
                  </div>
                </div>

                {/* Map Layer Option Switches */}
                <div className="space-y-2.5 pt-1.5 border-t border-border">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EAB308]">Layer Configuration</div>
                  <div className="space-y-2 text-xs bg-muted/20 border border-border p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer font-medium text-[11px]">Demand Heatmap</Label>
                      <Switch 
                        checked={showDemand} 
                        onCheckedChange={(val) => {
                          setShowDemand(val)
                          if (val) setShowGap(false)
                        }} 
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <Label className="cursor-pointer font-medium text-[11px]">Live Taxi Fleet</Label>
                      <Switch checked={showFleet} onCheckedChange={setShowFleet} />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <Label className="cursor-pointer font-medium text-[11px]">Supply-Demand Gap</Label>
                      <Switch 
                        checked={showGap} 
                        onCheckedChange={(val) => {
                          setShowGap(val)
                          if (val) setShowDemand(false)
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Telemetry Status when active */}
                {isSimActive && (
                  <div className="space-y-2.5 pt-1 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EAB308]">Telemetry Stream</span>
                      <Badge className="bg-success/15 text-success border-success/30 font-mono text-[9px] animate-pulse">
                        LIVE FEED
                      </Badge>
                    </div>
                    
                    {latestTick ? (
                      <div className="space-y-3 text-xs bg-slate-950 border border-border/80 p-3.5 rounded-xl text-white">
                        <div className="flex items-center justify-between font-mono">
                          <div>
                            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Simulated Time</span>
                            <div className="text-xs font-black text-white mt-0.5">
                              {new Date(latestTick.simulatedTime).toLocaleString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Timeline</span>
                            <div className="text-xs font-bold text-[#FACC15] mt-0.5">
                              Hr {latestTick.hourIndex} / {durationHours}
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#EAB308] to-[#FACC15] transition-all duration-300"
                            style={{ width: `${Math.min(100, (latestTick.hourIndex / durationHours) * 100)}%` }}
                          />
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-[10px]">
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[8px] text-muted-foreground font-bold flex items-center gap-1 uppercase">
                              <DollarSign className="size-2.5 text-emerald-400" />
                              Revenue
                            </span>
                            <span className="text-xs font-black text-emerald-400 mt-0.5 block">
                              ${Math.round(latestTick.aggregate?.totalRevenue || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[8px] text-muted-foreground font-bold flex items-center gap-1 uppercase">
                              <TrendingUp className="size-2.5 text-[#A78BFA]" />
                              Demand
                            </span>
                            <span className="text-xs font-black text-[#A78BFA] mt-0.5 block">
                              {Math.round(latestTick.aggregate?.totalDemand || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[8px] text-muted-foreground font-bold flex items-center gap-1 uppercase">
                              <Activity className="size-2.5 text-cyan-400" />
                              Active Cabs
                            </span>
                            <span className="text-xs font-black text-cyan-400 mt-0.5 block">
                              {latestTick.aggregate?.totalActiveTrips || 0}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[8px] text-muted-foreground font-bold flex items-center gap-1 uppercase">
                              <Clock className="size-2.5 text-amber-400" />
                              Avg ETA
                            </span>
                            <span className="text-xs font-black text-amber-400 mt-0.5 block">
                              {latestTick.aggregate?.avgEtaMinutes?.toFixed(1) || '0.0'}m
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2 border border-border rounded-xl">
                        <Loader2 className="size-3.5 animate-spin text-[#EAB308]" />
                        Connecting simulation feed...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <StatusBar />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
