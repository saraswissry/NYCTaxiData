'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { fleetApi, type ApiLogEntry } from '@/lib/fleet-api'
import { AuthGuard } from '@/components/auth-guard'
import {
  Bell, Search, AlertTriangle, AlertCircle, Info, CheckCircle,
  XCircle, Clock, ChevronRight, Volume2, VolumeX, Trash2, Download, RefreshCw,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeIcon(type: ApiLogEntry['type']) {
  switch (type) {
    case 'error':   return <XCircle className="size-4 text-destructive" />
    case 'warning': return <AlertTriangle className="size-4 text-warning" />
    case 'info':    return <Info className="size-4 text-primary" />
    case 'success': return <CheckCircle className="size-4 text-success" />
  }
}

function getTypeBadge(type: ApiLogEntry['type']) {
  switch (type) {
    case 'error':   return 'bg-destructive/20 text-destructive border-destructive/30'
    case 'warning': return 'bg-warning/20 text-warning border-warning/30'
    case 'info':    return 'bg-primary/20 text-primary border-primary/30'
    case 'success': return 'bg-success/20 text-success border-success/30'
  }
}

function formatTimestamp(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs] = React.useState<ApiLogEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [autoRefresh, setAutoRefresh] = React.useState(true)
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<ApiLogEntry['type'] | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<ApiLogEntry['category'] | 'all'>('all')
  const [selectedLog, setSelectedLog] = React.useState<ApiLogEntry | null>(null)

  const load = React.useCallback(async () => {
    try {
      // Try to load real logs from localStorage first (persisted log state)
      // Then supplement with live data from the API
      const data = await fleetApi.logs.getAll()

      // Also fetch recent dispatch feed to create live log entries
      try {
        const feed = await fleetApi.trips.getDispatchFeed(10, 60)
        if (feed && feed.length > 0) {
          const feedLogs: ApiLogEntry[] = feed.map((d, i) => ({
            id: `FEED-${d.tripId || i}`,
            message: `Dispatch: ${d.passengerName || 'Passenger'} → ${d.dropoffZoneName || 'Zone ' + d.dropoffZoneId}`,
            type: d.priority === 'CRITICAL' ? 'warning' as const : 'info' as const,
            category: 'dispatch' as const,
            timestamp: d.createdAt || new Date().toISOString(),
            details: `Driver: ${d.driverName || 'Unassigned'} | Priority: ${d.priority} | Pickup: ${d.pickupZoneName || 'Zone ' + d.pickupZoneId}`,
            read: false,
          }))
          // Merge, de-duplicate by id
          const existingIds = new Set(data.map(l => l.id))
          const newLogs = feedLogs.filter(l => !existingIds.has(l.id))
          data.push(...newLogs)
        }
      } catch {
        // Dispatch feed is supplementary — don't block
      }

      setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [autoRefresh, load])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || log.type === typeFilter
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
    return matchesSearch && matchesType && matchesCategory
  })

  const stats = {
    errors:   logs.filter((l) => l.type === 'error').length,
    warnings: logs.filter((l) => l.type === 'warning').length,
    unread:   logs.filter((l) => !l.read).length,
  }

  const markAsRead = async (id: string) => {
    try {
      await fleetApi.logs.markRead(id)
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, read: true } : l))
    } catch {
      // Best-effort
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, read: true } : l))
    }
  }

  const markAllAsRead = () => {
    logs.forEach((l) => { if (!l.read) fleetApi.logs.markRead(l.id).catch(() => {}) })
    setLogs((prev) => prev.map((l) => ({ ...l, read: true })))
  }

  const clearAll = () => setLogs([])

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">System Logs & Alerts</h1>
              <p className="text-sm text-muted-foreground">Real-time notifications and audit logs</p>
            </div>
            <Badge className={cn('animate-pulse', stats.errors > 0 ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-primary/20 text-primary border-primary/30')}>
              {stats.unread} Unread
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
              <span className="text-xs text-muted-foreground">Sound</span>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
              <span className="text-xs text-muted-foreground">Auto-refresh</span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Log list */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search logs…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                    <SelectItem value="warning">Warnings</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="dispatch">Dispatch</SelectItem>
                    <SelectItem value="fleet">Fleet</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Card className="px-2 py-1 bg-destructive/10 border-destructive/30 text-xs">
                    <span className="text-destructive font-medium">{stats.errors}</span>
                    <span className="text-muted-foreground ml-1">errors</span>
                  </Card>
                  <Card className="px-2 py-1 bg-warning/10 border-warning/30 text-xs">
                    <span className="text-warning font-medium">{stats.warnings}</span>
                    <span className="text-muted-foreground ml-1">warnings</span>
                  </Card>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs">
                    <CheckCircle className="size-3 mr-1" /> Mark all read
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="size-3 mr-1" /> Clear all
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading && (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Loading logs…</p>
                </div>
              )}
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div key={log.id}
                    className={cn('p-3 cursor-pointer transition-colors hover:bg-secondary/30', selectedLog?.id === log.id && 'bg-primary/10', !log.read && 'bg-secondary/20')}
                    onClick={() => { setSelectedLog(log); markAsRead(log.id) }}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getTypeIcon(log.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{log.message}</span>
                          {!log.read && <div className="size-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{log.id}</span>
                          <span>·</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">{log.category}</Badge>
                          <span>·</span>
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))}
                {!loading && filteredLogs.length === 0 && (
                  <div className="p-8 text-center">
                    <Bell className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                    <div className="text-sm text-muted-foreground">No logs found</div>
                    <div className="text-xs text-muted-foreground/60">Try adjusting your filters</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Detail panel */}
          <div className="w-96 bg-card/30 flex flex-col">
            {selectedLog ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className={cn('text-xs capitalize', getTypeBadge(selectedLog.type))}>
                      {selectedLog.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{selectedLog.id}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{selectedLog.message}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-auto space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Category</div>
                    <Badge variant="outline" className="capitalize">{selectedLog.category}</Badge>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Details</div>
                    <Card className="p-3 bg-secondary/30 text-xs text-muted-foreground font-mono">{selectedLog.details}</Card>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Metadata</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground">{selectedLog.read ? 'Read' : 'Unread'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className="text-foreground capitalize">{selectedLog.type}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-foreground capitalize">{selectedLog.category} Service</span></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-border space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Download className="size-4" /> Export Log
                  </Button>
                  {selectedLog.type === 'error' && (
                    <Button className="w-full justify-start gap-2 bg-primary">
                      <AlertCircle className="size-4" /> Create Incident
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <Bell className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <div className="text-sm text-muted-foreground">Select a log entry</div>
                  <div className="text-xs text-muted-foreground/60">View details and take action</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
