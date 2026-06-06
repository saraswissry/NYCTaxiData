'use client'

import * as React from 'react'
import { useDispatchStore } from '@/stores/use-dispatch-store'
import type { DispatchRequest } from '@/lib/dispatch-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Filter,
} from 'lucide-react'

interface DispatchQueueProps {
  requests: DispatchRequest[]
  className?: string
  error?: string | null
}

function getPriorityStyles(priority: DispatchRequest['priority']) {
  switch (priority) {
    case 'high':
      return 'bg-destructive/20 text-destructive border-destructive/30'
    case 'medium':
      return 'bg-warning/20 text-warning border-warning/30'
    case 'low':
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getStatusIcon(status: DispatchRequest['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="size-4 text-success" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'in-progress':
      return <Clock className="size-4 text-primary animate-pulse" />
    default:
      return <AlertCircle className="size-4 text-warning" />
  }
}

export function DispatchQueue({ requests, error, className }: DispatchQueueProps) {
  const selectedZoneId = useDispatchStore((s) => s.selectedZoneId)
  const selectedZoneLabel = useDispatchStore((s) => s.selectedZoneLabel)
  const clearSelectedZone = useDispatchStore((s) => s.clearSelectedZone)

  const filteredRequests = React.useMemo(() => {
    if (!selectedZoneId) return requests
    return requests.filter((r) => r.zoneId === selectedZoneId)
  }, [requests, selectedZoneId])

  return (
    <Card className={cn('h-full glass-cyber border-border/50 overflow-hidden flex flex-col', className)}>
      <div className="p-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">Dispatch Queue</h3>
          {selectedZoneId ? (
            <p className="text-[10px] text-[#A78BFA] font-mono truncate mt-0.5">
              Filtered · {selectedZoneLabel}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-0.5">All operational zones</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedZoneId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={clearSelectedZone}
            >
              <Filter className="size-3" />
              Clear
            </Button>
          )}
          <Badge variant="outline" className="font-mono text-[10px] border-[#7C3AED]/30 text-[#A78BFA]">
            {filteredRequests.length}
            {selectedZoneId ? ` / ${requests.length}` : ''}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
            <AlertCircle className="size-8 text-destructive mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-foreground">Database Stream Offline</p>
            <p className="text-[11px] text-muted-foreground mt-2 max-w-[240px] leading-relaxed">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5 border-destructive/20 text-destructive/80 hover:bg-destructive/10 hover:text-destructive text-[11px]"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <MapPin className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No dispatches in this zone</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              Select another hex on the heatmap or clear the filter to view all queue entries.
            </p>
            {selectedZoneId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearSelectedZone}
              >
                Show all logs
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className={cn(
                    'group border-border/40',
                    selectedZoneId && 'bg-primary/[0.03]'
                  )}
                >
                  <TableCell className="font-mono text-xs">{request.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3 text-[#7C3AED]" />
                      <span className="truncate max-w-[120px]">{request.zone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', getPriorityStyles(request.priority))}
                    >
                      {request.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(request.driversAssigned / request.driversNeeded) * 100}
                        className="w-16 h-1.5"
                      />
                      <span className="text-xs text-muted-foreground">
                        {request.driversAssigned}/{request.driversNeeded}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{request.eta}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(request.status)}
                      <span className="text-xs capitalize">{request.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </Card>
  )
}
