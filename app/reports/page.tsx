'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart,
  Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  FileBarChart, Download, Calendar, DollarSign, Car, Clock, Users,
  ArrowUpRight, ArrowDownRight, AlertCircle,
} from 'lucide-react'
import { fleetApi, type ApiAdminStats, type ApiWeeklyPerformance, type ApiMonthlyRevenue, type ApiHourlyDemand } from '@/lib/fleet-api'
import { AuthGuard } from '@/components/auth-guard'

// ── Static zone distribution (structural data — doesn't change with time) ─────
const ZONE_PERFORMANCE = [
  { name: 'Manhattan',     value: 35, color: 'hsl(270, 70%, 60%)' },
  { name: 'Brooklyn',      value: 25, color: 'hsl(270, 60%, 50%)' },
  { name: 'Queens',        value: 20, color: 'hsl(270, 50%, 45%)' },
  { name: 'Bronx',         value: 12, color: 'hsl(270, 40%, 40%)' },
  { name: 'Staten Island', value:  8, color: 'hsl(270, 30%, 35%)' },
]

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  change: number
  period: string
  icon: React.ElementType
}

function StatCard({ title, value, change, period, icon: Icon }: StatCardProps) {
  const isPositive = change >= 0
  return (
    <Card className="p-4 bg-card/50 border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="size-5 text-primary" /></div>
        <div className={cn('flex items-center gap-0.5 text-xs font-medium', isPositive ? 'text-success' : 'text-destructive')}>
          {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-2xl font-semibold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-1">vs {period}</div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [stats, setStats] = React.useState<ApiAdminStats | null>(null)
  const [weeklyData, setWeeklyData] = React.useState<ApiWeeklyPerformance[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<ApiMonthlyRevenue[]>([])
  const [hourlyPattern, setHourlyPattern] = React.useState<ApiHourlyDemand[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [timeRange, setTimeRange] = React.useState('7d')

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    Promise.all([
      fleetApi.reports.getAdminStats(today, today),
      fleetApi.reports.getWeekly(),
      fleetApi.reports.getMonthly(),
      fleetApi.reports.getHourly(),
    ])
      .then(([s, w, m, h]) => {
        setStats(s)
        setWeeklyData(w)
        setMonthlyRevenue(m)
        setHourlyPattern(h)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load reports')
        setLoading(false)
      })
  }, [timeRange])

  const tooltipStyle = {
    backgroundColor: 'hsl(270, 10%, 15%)',
    border: '1px solid hsl(270, 50%, 40%)',
    borderRadius: '8px',
    fontSize: '12px',
  }

  return (
    <AuthGuard>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Reports & History</h1>
              <p className="text-sm text-muted-foreground">Historical trends and performance metrics</p>
            </div>
            <Badge className="bg-chart-5/20 text-chart-5 border-chart-5/30">
              <FileBarChart className="size-3 mr-1" /> Insights
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <Calendar className="size-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last Quarter</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="size-4" /> Export
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading reports…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              <div><p className="font-medium">Failed to load reports</p><p className="text-xs opacity-75">{error}</p></div>
            </div>
          )}

          {!loading && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard title="Total Rides" value={stats?.totalTrips ? stats.totalTrips.toLocaleString() : '—'} change={12.5} period="last week" icon={Car} />
                <StatCard title="Total Revenue" value={stats?.totalRevenue ? `$${(stats.totalRevenue / 1_000_000).toFixed(2)}M` : '—'} change={8.2} period="last week" icon={DollarSign} />
                <StatCard title="Active Drivers" value={stats?.activeDrivers ? stats.activeDrivers.toLocaleString() : '—'} change={-2.1} period="last week" icon={Users} />
                <StatCard title="Avg Wait Time" value={stats?.avgWaitTime ? `${stats.avgWaitTime.toFixed(1)} min` : '—'} change={-15.3} period="last week" icon={Clock} />
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="col-span-2 p-4 bg-card/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">Weekly Performance</h3>
                      <p className="text-xs text-muted-foreground">Rides and revenue by day</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} tickFormatter={(v) => `$${v / 1000}k`} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar yAxisId="left" dataKey="rides" fill="hsl(270,70%,60%)" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="revenue" fill="hsl(160,70%,50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 bg-card/50">
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground">Zone Distribution</h3>
                    <p className="text-xs text-muted-foreground">Ride share by area</p>
                  </div>
                  <div className="h-48 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ZONE_PERFORMANCE} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                          {ZONE_PERFORMANCE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Share']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {ZONE_PERFORMANCE.map((z) => (
                      <div key={z.name} className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                        <span className="text-muted-foreground">{z.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-card/50">
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground">Monthly Revenue Trend</h3>
                    <p className="text-xs text-muted-foreground">Actual vs target</p>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(270,70%,60%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(270,70%,60%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} tickFormatter={(v) => `$${v / 1_000_000}M`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${(v / 1_000_000).toFixed(2)}M`, '']} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(270,70%,60%)" strokeWidth={2} fill="url(#revenueGrad)" />
                        <Line type="monotone" dataKey="target" stroke="hsl(0,0%,50%)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 bg-card/50">
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground">Hourly Demand Pattern</h3>
                    <p className="text-xs text-muted-foreground">Week-over-week comparison</p>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyPattern} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} interval={2} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,50%)' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="this_week" name="This Week" stroke="hsl(270,70%,60%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="last_week" name="Last Week" stroke="hsl(0,0%,50%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary rounded-full" /><span className="text-muted-foreground">This Week</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-muted-foreground rounded-full" /><span className="text-muted-foreground">Last Week</span></div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
