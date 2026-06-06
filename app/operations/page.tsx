'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { Badge } from '@/components/ui/badge'
import { CountingUp } from '@/components/ui/counting-up'
import { TwinViewMap } from '@/components/twin-view-map'
import { CounterfactualPanel } from '@/components/counterfactual-panel'
import type { FlowArc } from '@/components/twin-view-map'
import type { CounterfactualResult } from '@/components/counterfactual-panel'
import {
  Activity, Car, DollarSign, Clock, TrendingUp, TrendingDown,
  SplitSquareHorizontal, Map, Cpu, Wifi, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth-guard'
import { fleetApi } from '@/lib/fleet-api'

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  change?: string
  positive?: boolean
  icon: React.ElementType
  glowColor: string
}

function KPICard({ title, value, prefix = '', suffix = '', decimals = 0, change, positive = true, icon: Icon, glowColor }: KPICardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 flex items-center justify-between transition-all hover:translate-y-[-1px]"
      style={{
        background: 'linear-gradient(145deg, rgba(14,12,30,0.95) 0%, rgba(10,8,22,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 0 0 1px rgba(${glowColor},0.1), 0 4px 20px rgba(0,0,0,0.4)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 50%, rgb(${glowColor}) 0%, transparent 70%)` }}
      />
      <div className="flex items-center gap-3 z-10">
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{
            background: `rgba(${glowColor},0.12)`,
            border: `1px solid rgba(${glowColor},0.25)`,
            boxShadow: `0 0 12px rgba(${glowColor},0.2)`,
          }}
        >
          <Icon className="size-4" style={{ color: `rgb(${glowColor})` }} />
        </div>
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
          <div className="text-xl font-black text-white leading-tight mt-0.5 tracking-tight">
            <CountingUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </div>
        </div>
      </div>
      {change && (
        <div
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg z-10"
          style={{
            background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${positive ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
            color: positive ? '#4ade80' : '#f87171',
          }}
        >
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {change}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const [flowArcs, setFlowArcs] = React.useState<FlowArc[]>([])
  const [result, setResult] = React.useState<CounterfactualResult | null>(null)
  const [splitMode, setSplitMode] = React.useState(true)
  const [panelOpen, setPanelOpen] = React.useState(true)
  
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  // Fetch real data from the production API
  React.useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const data = await fleetApi.admin.getStats('2024-01-01', '2024-12-31')
        setStats(data)
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveStats()
  }, [])

  // Map API response fields to KPI card values
  const kpis = React.useMemo(() => {
    return {
      peakDemand: stats?.peakDemand ?? stats?.totalTrips ?? 0,
      activeTaxis: stats?.activeTaxis ?? stats?.activeDrivers ?? stats?.totalDrivers ?? 0,
      avgWaitTime: stats?.avgWaitTime ?? 0,
      revForecast: (stats?.totalRevenue ?? stats?.revenue ?? stats?.totalFare ?? 0) / 1000,
    }
  }, [stats])

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#050408] flex-col gap-3">
        <Loader2 className="size-8 text-purple-500 animate-spin" />
        <p className="text-xs font-mono tracking-widest text-purple-400 uppercase">Connecting to FleetCommand Server...</p>
      </div>
    )
  }

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden bg-[#050408] text-white">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 py-3 border-b flex flex-col gap-3"
          style={{ borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(8,6,20,0.95)', backdropFilter: 'blur(12px)' }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="size-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))',
                  border: '1px solid rgba(124,58,237,0.4)',
                  boxShadow: '0 0 16px rgba(124,58,237,0.3)',
                }}
              >
                <Cpu className="size-4 text-violet-300" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight">FleetCommand — Operations Center</h1>
                <p className="text-[10px] text-slate-500 font-mono">Twin-View Demand Intelligence · Counterfactual Evaluation</p>
              </div>
              <Badge
                className="ml-2 text-[9px] animate-pulse"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <Wifi className="size-2.5 mr-1" /> LIVE CONNECTED
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn('h-8 text-[10px] gap-1.5 font-mono font-bold uppercase tracking-wider transition-all')}
                style={{
                  background: splitMode ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border: splitMode ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: splitMode ? '#818cf8' : '#64748b',
                }}
                onClick={() => setSplitMode((s) => !s)}
              >
                <SplitSquareHorizontal className="size-3.5" />
                {splitMode ? 'Twin View' : 'Single View'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] gap-1.5 font-mono font-bold uppercase tracking-wider transition-all"
                style={{
                  background: panelOpen ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                  border: panelOpen ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: panelOpen ? '#a78bfa' : '#64748b',
                }}
                onClick={() => setPanelOpen((s) => !s)}
              >
                <Map className="size-3.5" />
                {panelOpen ? 'Hide Panel' : 'Sim Panel'}
              </Button>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="Peak Demand" value={kpis.peakDemand} decimals={1} suffix="/10" change="+0.4" positive icon={Activity} glowColor="248,113,113" />
            <KPICard title="Optimal Fleet Size" value={kpis.activeTaxis} change="+12%" positive icon={Car} glowColor="139,92,246" />
            <KPICard title="Avg Wait Time" value={kpis.avgWaitTime} suffix=" min" decimals={1} change={result ? '-1.4min' : '-0.3'} positive={!!result} icon={Clock} glowColor="56,189,248" />
            <KPICard title="Revenue Forecast" value={kpis.revForecast} prefix="$" suffix="K" decimals={1} change={result ? `+$${((result.intervention.revenue - result.baseline.revenue) / 1000).toFixed(1)}K` : '+$2.4K'} positive icon={DollarSign} glowColor="74,222,128" />
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Map area */}
          <div className="flex-1 relative min-w-0">
            <TwinViewMap
              className="absolute inset-0"
              flowArcs={flowArcs}
              splitMode={splitMode}
            />
          </div>

          {/* Simulation panel */}
          {panelOpen && (
            <div
              className="w-[340px] flex-shrink-0 h-full"
              style={{ borderLeft: '1px solid rgba(139,92,246,0.15)' }}
            >
              <CounterfactualPanel
                className="h-full"
                onResult={setResult}
                onFlowArcsChange={setFlowArcs}
              />
            </div>
          )}
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}