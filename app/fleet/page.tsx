'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { FleetMap } from '@/components/fleet-map'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { fleetApi, type ApiVehicle } from '@/lib/fleet-api'
import { AuthGuard } from '@/components/auth-guard'
import {
  Car, Navigation, Search, MapPin, Clock,
  User, Phone, ChevronRight, Circle, AlertCircle,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusColor(status: ApiVehicle['status']) {
  switch (status) {
    case 'active':    return 'bg-success text-success-foreground'
    case 'idle':      return 'bg-warning text-warning-foreground'
    case 'en-route':  return 'bg-primary text-primary-foreground'
    case 'charging':  return 'bg-chart-2 text-white'
    default:          return 'bg-muted text-muted-foreground'
  }
}

function getStatusDot(status: ApiVehicle['status']) {
  switch (status) {
    case 'active':    return 'text-success'
    case 'idle':      return 'text-warning'
    case 'en-route':  return 'text-primary'
    case 'charging':  return 'text-chart-2'
    default:          return 'text-muted-foreground'
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FleetTrackingPage() {
  const [vehicles, setVehicles] = React.useState<ApiVehicle[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = React.useState<ApiVehicle | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<ApiVehicle['status'] | 'all'>('all')

  // Poll every 5 s for live positions
  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fleetApi.vehicles.getAll()
        if (!cancelled) {
          setVehicles(data)
          setLoading(false)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load fleet data')
          setLoading(false)
        }
      }
    }
    load()
    const id = setInterval(load, 5_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Keep selected vehicle in sync with latest position data
  React.useEffect(() => {
    if (!selectedVehicle) return
    const updated = vehicles.find((v) => v.vehicle_id === selectedVehicle.vehicle_id)
    if (updated) setSelectedVehicle(updated)
  }, [vehicles]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      v.vehicle_id.toLowerCase().includes(q) ||
      v.driver_name.toLowerCase().includes(q) ||
      v.plate.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    active:   vehicles.filter((v) => v.status === 'active').length,
    idle:     vehicles.filter((v) => v.status === 'idle').length,
    enRoute:  vehicles.filter((v) => v.status === 'en-route').length,
    offline:  vehicles.filter((v) => v.status === 'offline').length,
  }

  // Shape for FleetMap prop (it expects the old Vehicle interface shape)
  const mapVehicles = filteredVehicles.map((v) => ({
    id: v.vehicle_id,
    driver: v.driver_name,
    longitude: v.longitude,
    latitude: v.latitude,
    heading: v.heading,
    status: v.status as string,
  }))

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Fleet Tracking</h1>
              <p className="text-sm text-muted-foreground">Live vehicle locations and driver status</p>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">LIVE</Badge>
          </div>
          <div className="flex gap-2">
            <Card className="px-3 py-1.5 bg-success/10 border-success/30">
              <div className="text-center"><div className="text-sm font-semibold text-success">{stats.active}</div><div className="text-[10px] text-muted-foreground">Active</div></div>
            </Card>
            <Card className="px-3 py-1.5 bg-primary/10 border-primary/30">
              <div className="text-center"><div className="text-sm font-semibold text-primary">{stats.enRoute}</div><div className="text-[10px] text-muted-foreground">En Route</div></div>
            </Card>
            <Card className="px-3 py-1.5 bg-warning/10 border-warning/30">
              <div className="text-center"><div className="text-sm font-semibold text-warning">{stats.idle}</div><div className="text-[10px] text-muted-foreground">Idle</div></div>
            </Card>
            <Card className="px-3 py-1.5 bg-muted/50 border-border">
              <div className="text-center"><div className="text-sm font-semibold text-muted-foreground">{stats.offline}</div><div className="text-[10px] text-muted-foreground">Offline</div></div>
            </Card>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative bg-background">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Loading fleet positions…</p>
                </div>
              </div>
            ) : (
              <FleetMap
                vehicles={mapVehicles as any}
                onSelectVehicle={(v: any) => {
                  const full = vehicles.find((x) => x.vehicle_id === v.id)
                  if (full) setSelectedVehicle(full)
                }}
                selectedVehicleId={selectedVehicle?.vehicle_id}
              />
            )}

            {selectedVehicle && (
              <Card className="absolute top-4 right-4 z-20 bg-card/95 backdrop-blur-md border-primary/30 p-4 w-64 shadow-2xl animate-in fade-in slide-in-from-right-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-base text-foreground">{selectedVehicle.vehicle_id}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{selectedVehicle.plate}</div>
                  </div>
                  <Badge className={cn('text-[10px] px-1.5 py-0', getStatusColor(selectedVehicle.status))}>
                    {selectedVehicle.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-foreground bg-secondary/30 p-2 rounded-md">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Driver</div>
                      <div className="font-semibold">{selectedVehicle.driver_name}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/20 p-2 rounded-md">
                      <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Zone</div>
                      <div className="text-[11px] font-medium flex items-center gap-1">
                        <MapPin className="size-3 text-primary" />
                        {selectedVehicle.zone_name}
                      </div>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded-md">
                      <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Last Seen</div>
                      <div className="text-[11px] font-medium flex items-center gap-1">
                        <Clock className="size-3 text-primary" />
                        {relativeTime(selectedVehicle.last_seen)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] uppercase font-bold">
                    <Phone className="size-3 mr-1" /> Comm Link
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-[10px] uppercase font-bold bg-primary">
                    <Navigation className="size-3 mr-1" /> Focus Unit
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Vehicle List Panel */}
          <div className="w-80 border-l border-border bg-card/50 flex flex-col">
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search vehicles…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
              </div>
              <div className="flex gap-1">
                {(['all', 'active', 'en-route', 'idle', 'offline'] as const).map((s) => (
                  <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={cn('h-7 px-2 text-[10px] flex-1', statusFilter === s && 'bg-primary text-primary-foreground')}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredVehicles.map((vehicle) => (
                  <Card key={vehicle.vehicle_id}
                    className={cn('p-2 cursor-pointer transition-all hover:bg-secondary/50', selectedVehicle?.vehicle_id === vehicle.vehicle_id && 'bg-primary/10 border-primary/30')}
                    onClick={() => setSelectedVehicle(vehicle)}>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-secondary">
                          {vehicle.driver_name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{vehicle.vehicle_id}</span>
                          <Circle className={cn('size-2 fill-current', getStatusDot(vehicle.status))} />
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {vehicle.driver_name} · {vehicle.zone_name}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground">{relativeTime(vehicle.last_seen)}</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
                {!loading && filteredVehicles.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">No vehicles match filters</div>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <div className="text-xs text-muted-foreground text-center">
                Showing {filteredVehicles.length} of {vehicles.length} vehicles
              </div>
            </div>
          </div>
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
