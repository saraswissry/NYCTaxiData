'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { DemandHeatmap } from '@/components/demand-heatmap'
import { DispatchQueue } from '@/components/dispatch-queue'
import { DispatchSidePanel } from '@/components/dispatch-side-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDispatchStore } from '@/stores/use-dispatch-store'
import { fleetApi, type ApiDispatch } from '@/lib/fleet-api'
import {
  defaultAutoDispatchRules,
  DISPATCH_ZONE_OPTIONS,
} from '@/lib/dispatch-mock-data'
import type { AutoDispatchRule, DispatchRequest } from '@/lib/dispatch-types'
import { AuthGuard } from '@/components/auth-guard'
import {
  Send,
  Users,
  MapPin,
  Play,
  Pause,
  Settings2,
  Zap,
  AlertCircle,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react'

export default function DispatchPage() {
  const [requests, setRequests] = React.useState<DispatchRequest[]>([])
  const [rules, setRules] = React.useState<AutoDispatchRule[]>(defaultAutoDispatchRules)
  const [driverCount, setDriverCount] = React.useState('')
  const [autoDispatch, setAutoDispatch] = React.useState(true)
  const [panelOpen, setPanelOpen] = React.useState(true)

  // Load and poll live dispatch queue from real API
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const feed = await fleetApi.dispatches.getAll(50, 120)
        if (!cancelled) {
          // Map API dispatch items to the DispatchRequest shape the UI expects
          const mapped: DispatchRequest[] = (feed || []).map((d: ApiDispatch) => ({
            id: String(d.tripId),
            zoneId: String(d.pickupZoneId),
            zone: d.pickupZoneName || `Zone ${d.pickupZoneId}`,
            status: d.status === 'Completed' ? 'completed' as const :
                    d.status === 'InProgress' || d.status === 'Dispatched' ? 'in-progress' as const :
                    'pending' as const,
            priority: (d.priority || 'NORMAL').toLowerCase() as any,
            driver: d.driverName || 'Unassigned',
            passenger: d.passengerName || 'Unknown',
            pickup: d.pickupZoneName || `Zone ${d.pickupZoneId}`,
            dropoff: d.dropoffZoneName || `Zone ${d.dropoffZoneId}`,
            createdAt: d.createdAt || new Date().toISOString(),
          }))
          setRequests(mapped)
        }
      } catch {
        // If API fails, keep existing data
      }
    }
    load()
    const id = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const selectedZoneId = useDispatchStore((s) => s.selectedZoneId)
  const selectedZoneLabel = useDispatchStore((s) => s.selectedZoneLabel)
  const setSelectedZone = useDispatchStore((s) => s.setSelectedZone)
  const clearSelectedZone = useDispatchStore((s) => s.clearSelectedZone)
  const selectedZoneMetrics = useDispatchStore((s) => s.selectedZoneMetrics)

  const filteredForStats = React.useMemo(
    () =>
      selectedZoneId
        ? requests.filter((r) => r.zoneId === selectedZoneId)
        : requests,
    [requests, selectedZoneId]
  )

  const stats = React.useMemo(
    () => ({
      pending: filteredForStats.filter((r) => r.status === 'pending').length,
      inProgress: filteredForStats.filter((r) => r.status === 'in-progress').length,
      completed: filteredForStats.filter((r) => r.status === 'completed').length,
      successRate: 94.2,
    }),
    [filteredForStats]
  )

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule))
    )
  }

  const handleManualZoneChange = (zoneId: string) => {
    const option = DISPATCH_ZONE_OPTIONS.find((z) => z.zoneId === zoneId)
    if (!option) return
    setSelectedZone({
      zoneId: option.zoneId,
      zone: option.label,
      trips: selectedZoneMetrics?.trips ?? 0,
      avgFare: selectedZoneMetrics?.avgFare ?? '24.00',
      supply: selectedZoneMetrics?.supply ?? 0,
      gap: selectedZoneMetrics?.gap ?? 0,
    })
  }

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-[#0A0B10]">
        {/* Full-bleed map — primary control surface */}
        <div className="relative flex-1 min-h-0">
          <DemandHeatmap showFleet className="absolute inset-0 h-full w-full" />

          {/* Floating command bar */}
          <div className="absolute top-0 left-0 right-0 z-30 p-3 pointer-events-none">
            <div className="glass-cyber glow-purple pointer-events-auto mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <h1 className="text-base font-bold text-foreground leading-tight">
                    Dispatch & Operations
                  </h1>
                  <p className="text-[10px] text-muted-foreground">
                    Visualization + dispatch control center
                  </p>
                </div>
                <Badge className="bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED]/30 shrink-0">
                  <Zap className="size-3 mr-1" />
                  Hub
                </Badge>
                {selectedZoneId && (
                  <Badge className="bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30 animate-pulse shrink-0">
                    Focus Mode
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden sm:flex items-center gap-3 mr-1">
                  <StatPill label="Pending" value={stats.pending} className="text-warning" />
                  <StatPill label="Active" value={stats.inProgress} className="text-[#A78BFA]" />
                  <StatPill label="Done" value={stats.completed} className="text-success" />
                </div>
                {selectedZoneId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-primary/30 text-[#A78BFA]"
                    onClick={clearSelectedZone}
                  >
                    <RotateCcw className="size-3.5" />
                    Reset
                  </Button>
                )}
                <div className="flex items-center gap-2 border-l border-border/50 pl-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:inline">
                    Auto
                  </span>
                  <Switch checked={autoDispatch} onCheckedChange={setAutoDispatch} />
                  <Button variant={autoDispatch ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5">
                    {autoDispatch ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  </Button>
                </div>
                {!panelOpen && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-primary/30 text-[#A78BFA]"
                    onClick={() => setPanelOpen(true)}
                  >
                    <PanelRightOpen className="size-3.5" />
                    Queue
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DispatchSidePanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            title="Dispatch Queue"
            subtitle={
              selectedZoneId
                ? `Focus · ${selectedZoneLabel}`
                : 'All zones — click map to drill down'
            }
          >
            <div className="flex flex-col h-full min-h-0">
              <div className="p-3 border-b border-border/50 shrink-0 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="size-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Manual Dispatch</span>
                </div>
                <Select value={selectedZoneId ?? ''} onValueChange={handleManualZoneChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <MapPin className="size-3.5 mr-2 text-[#7C3AED]" />
                    <SelectValue placeholder="Zone (map or list)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPATCH_ZONE_OPTIONS.map((z) => (
                      <SelectItem key={z.zoneId} value={z.zoneId}>
                        {z.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Drivers"
                      value={driverCount}
                      onChange={(e) => setDriverCount(e.target.value)}
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                  <Button size="sm" className="h-9 gap-1 bg-primary glow-purple shrink-0">
                    <Send className="size-3.5" />
                    Go
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-3 pt-0">
                <DispatchQueue
                  requests={requests}
                  className="h-full border-0 shadow-none bg-transparent"
                />
              </div>

              <div className="shrink-0 border-t border-border/50 p-3 max-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                    Automation
                  </span>
                  <Button variant="ghost" size="icon" className="size-6">
                    <Settings2 className="size-3" />
                  </Button>
                </div>
                <ScrollArea className="h-[88px]">
                  <div className="space-y-2 pr-2">
                    {rules.slice(0, 2).map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          'rounded-lg border p-2 text-[10px]',
                          rule.enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">{rule.name}</span>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-8 gap-1.5 text-destructive border-destructive/30 text-[10px]"
                >
                  <AlertCircle className="size-3" />
                  Emergency Broadcast
                </Button>
              </div>
            </div>
          </DispatchSidePanel>
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}

function StatPill({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="text-center px-2">
      <div className={cn('text-sm font-bold font-mono tabular-nums', className)}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}
