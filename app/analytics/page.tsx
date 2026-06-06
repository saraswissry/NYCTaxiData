'use client'

import * as React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Compass,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  MapPin,
  Clock
} from 'lucide-react'
import { AuthGuard } from '@/components/auth-guard'
import { fleetApi } from '@/lib/fleet-api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function AnalyticsDashboardPage() {
  const [mounted, setMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Data states
  const [topRevenue, setTopRevenue] = React.useState<any[]>([])
  const [topDemand, setTopDemand] = React.useState<any[]>([])
  const [recommended, setRecommended] = React.useState<any[]>([])
  const [highStockout, setHighStockout] = React.useState<any[]>([])
  const [activeDrivers, setActiveDrivers] = React.useState<any[]>([])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [revRes, demRes, recRes, stockRes, driverRes] = await Promise.all([
        fleetApi.zones.getTopRevenue(10),
        fleetApi.zones.getTopDemand(10),
        fleetApi.zones.getRecommended(10),
        fleetApi.zones.getHighStockout(10),
        fleetApi.vehicles.getAll(200)
      ])

      setTopRevenue(revRes || [])
      setTopDemand(demRes || [])
      setRecommended(recRes || [])
      setHighStockout(stockRes || [])
      setActiveDrivers(driverRes || [])
    } catch (err: any) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to fetch analytics data. Please ensure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    setMounted(true)
    loadData()
    // Poll data every 20 seconds
    const id = setInterval(loadData, 20_000)
    return () => clearInterval(id)
  }, [loadData])

  // Driver status stats
  const driverStats = React.useMemo(() => {
    const stats: Record<string, number> = {}
    activeDrivers.forEach((d) => {
      const status = d.status || 'Offline'
      stats[status] = (stats[status] || 0) + 1
    })

    const colors: Record<string, string> = {
      Available: '#10B981', // green
      Busy: '#EF4444',      // red
      OnTrip: '#F59E0B',    // orange
      Offline: '#6B7280'     // grey
    }

    return Object.entries(stats).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#A78BFA'
    }))
  }, [activeDrivers])

  // Top KPIs
  const kpis = React.useMemo(() => {
    const totalRevenueSum = topRevenue.reduce((sum, item) => sum + (item.calculatedRevenue || item.totalRevenue || 0), 0)
    const totalPickupsSum = topDemand.reduce((sum, item) => sum + (item.calculatedPickups || item.pickupCount || 0), 0)
    const activeCount = activeDrivers.filter(d => d.status !== 'Offline').length
    const criticalStockouts = highStockout.filter((item) => (item.stockoutProbability || item.calculatedStockoutProbability || 0) > 0.75).length

    return [
      {
        title: 'Active Drivers',
        value: activeDrivers.length > 0 ? activeCount : '...',
        description: `${activeDrivers.length} registered total`,
        icon: Users,
        color: 'from-[#38BDF8]/20 to-[#38BDF8]/5 text-[#38BDF8] border-[#38BDF8]/20'
      },
      {
        title: 'Top Zones Revenue',
        value: totalRevenueSum > 0 ? `$${totalRevenueSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '...',
        description: 'Sum of top 10 zones',
        icon: DollarSign,
        color: 'from-[#10B981]/20 to-[#10B981]/5 text-[#10B981] border-[#10B981]/20'
      },
      {
        title: 'Total Pickups (Top 10)',
        value: totalPickupsSum > 0 ? totalPickupsSum.toLocaleString() : '...',
        description: 'Trips processed in hotspots',
        icon: TrendingUp,
        color: 'from-[#A78BFA]/20 to-[#A78BFA]/5 text-[#A78BFA] border-[#A78BFA]/20'
      },
      {
        title: 'Critical Stockout Risks',
        value: highStockout.length > 0 ? criticalStockouts : '...',
        description: 'Zones with >75% risk probability',
        icon: AlertTriangle,
        color: 'from-[#EF4444]/20 to-[#EF4444]/5 text-[#EF4444] border-[#EF4444]/20'
      }
    ]
  }, [topRevenue, topDemand, activeDrivers, highStockout])

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen overflow-hidden bg-[#0A0B10] text-foreground">
          {/* Header */}
          <div className="border-b border-white/5 bg-[#0D0E15]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2.5 py-0.5 text-[10px] font-mono text-[#A78BFA] uppercase tracking-wider">
                <Sparkles className="size-3 text-[#A78BFA]" />
                Predictive Analytics Platform
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Mobility Analytics & Intelligence
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/10 text-xs text-white"
                onClick={loadData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Refresh
              </Button>
              <Badge className="bg-[#10B981]/15 text-[#34D399] border-[#10B981]/25 font-mono">
                API Live
              </Badge>
            </div>
          </div>

          {/* Scrolling Content container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <Card className="border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-200">Data Synchronization Error</h3>
                  <p className="text-xs text-red-300/80 mt-1">{error}</p>
                </div>
              </Card>
            )}

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, idx) => {
                const Icon = kpi.icon
                return (
                  <Card
                    key={idx}
                    className={`relative overflow-hidden border bg-gradient-to-br p-5 flex flex-col justify-between min-h-[110px] bg-slate-900/40 border-white/5 shadow-lg ${kpi.color}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="text-2xl font-black font-mono tracking-tight text-white mt-1">
                          {kpi.value}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 font-medium">
                      {kpi.description}
                    </p>
                  </Card>
                )
              })}
            </div>

            {/* Dashboard Tabs */}
            {mounted && (
              <Tabs defaultValue="demand" className="space-y-6 w-full">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <TabsList className="bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                    <TabsTrigger value="demand" className="text-xs px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                      Demand & Revenue
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="text-xs px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                      Strategic Recommendations
                    </TabsTrigger>
                    <TabsTrigger value="supply" className="text-xs px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                      Supply Deficits & Drivers
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: DEMAND & REVENUE */}
                <TabsContent value="demand" className="space-y-6 outline-none">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Top Revenue Zones Chart */}
                    <Card className="p-5 border border-white/5 bg-[#0D0E15]/50 shadow-xl rounded-2xl flex flex-col h-[400px]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <DollarSign className="size-4 text-[#10B981]" />
                            Top Revenue Zones ($)
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Comparison of calculated revenue versus predictive machine learning forecasts
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        {topRevenue.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            {loading ? 'Streaming from API...' : 'No revenue data available'}
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topRevenue}
                              margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                              <XAxis
                                dataKey="zoneName"
                                stroke="#888"
                                fontSize={9}
                                tickLine={false}
                                tickFormatter={(tick) =>
                                  tick.length > 12 ? `${tick.substring(0, 10)}...` : tick
                                }
                              />
                              <YAxis stroke="#888" fontSize={9} tickLine={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0D0E15',
                                  borderColor: 'rgba(255,255,255,0.1)',
                                  fontSize: 11
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                              <Bar
                                dataKey="calculatedRevenue"
                                name="Historical Revenue"
                                fill="#10B981"
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="predictedRevenue"
                                name="Forecasted Revenue"
                                fill="#A78BFA"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </Card>

                    {/* Top Demand Zones Chart */}
                    <Card className="p-5 border border-white/5 bg-[#0D0E15]/50 shadow-xl rounded-2xl flex flex-col h-[400px]">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <TrendingUp className="size-4 text-[#A78BFA]" />
                            Passenger Demand Hotspots (Trips)
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            Comparison of actual pickups vs machine learning demand forecasts
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        {topDemand.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            {loading ? 'Streaming from API...' : 'No demand data available'}
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={topDemand}
                              margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                            >
                              <defs>
                                <linearGradient id="colorCalculated" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                              <XAxis
                                dataKey="zoneName"
                                stroke="#888"
                                fontSize={9}
                                tickLine={false}
                                tickFormatter={(tick) =>
                                  tick.length > 12 ? `${tick.substring(0, 10)}...` : tick
                                }
                              />
                              <YAxis stroke="#888" fontSize={9} tickLine={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0D0E15',
                                  borderColor: 'rgba(255,255,255,0.1)',
                                  fontSize: 11
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Area
                                type="monotone"
                                dataKey="calculatedPickups"
                                name="Historical Pickups"
                                stroke="#A78BFA"
                                fillOpacity={1}
                                fill="url(#colorCalculated)"
                              />
                              <Area
                                type="monotone"
                                dataKey="predictedPickups"
                                name="Forecasted Pickups"
                                stroke="#38BDF8"
                                fillOpacity={1}
                                fill="url(#colorPredicted)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB 2: STRATEGIC RECOMMENDATIONS */}
                <TabsContent value="recommendations" className="space-y-6 outline-none">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: List of Recommended Zones */}
                    <Card className="lg:col-span-2 p-5 border border-white/5 bg-[#0D0E15]/50 shadow-xl rounded-2xl flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Compass className="size-4 text-[#A78BFA]" />
                          Hotspot Dispatch Recommendations
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          AI-driven recommendation index scores mapped by zone revenue yield and supply gaps
                        </p>
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {recommended.length === 0 ? (
                          <div className="py-8 text-center text-xs text-muted-foreground">
                            {loading ? 'Generating suggestions...' : 'No recommendations available'}
                          </div>
                        ) : (
                          recommended.map((zone, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#7C3AED]/20 transition-all flex items-start justify-between gap-4"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED]/30 font-mono text-[9px]">
                                    Score: {Math.round(zone.recommendationScore * 100)}
                                  </Badge>
                                  <h4 className="text-xs font-bold text-white truncate">{zone.zoneName}</h4>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-normal">
                                  {zone.reason || 'AI recommends redirecting idle supply to capture elevated passenger bookings.'}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono text-[#A78BFA]/80">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="size-3 text-muted-foreground" />
                                    {zone.borough || 'Unknown'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="size-3 text-muted-foreground" />
                                    Avg Fare: ${zone.avgFare?.toFixed(2) || '0.00'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3 text-muted-foreground" />
                                    Yield Ratio: {zone.demandSupplyRatio?.toFixed(1) || '1.0'}x
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-muted-foreground block">Predicted Yield</span>
                                <span className="text-sm font-extrabold text-[#10B981] font-mono">
                                  +${zone.predictedRevenueYield?.toFixed(0) || '0'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    {/* Right Column: AI Repositioning Rule Card */}
                    <Card className="p-5 border border-white/5 bg-gradient-to-b from-[#1E1B4B]/30 to-[#0A0B10] shadow-xl rounded-2xl flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="size-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
                          <Compass className="size-5 text-[#A78BFA]" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white">Rule-Based Dispatch Logic</h3>
                          <p className="text-xs text-muted-foreground leading-normal">
                            System rules translate predicted passenger density and supply gap indices into recommendations. When demand exceeds driver capacity in a sector, the system highlights relocation strategies.
                          </p>
                        </div>
                        <div className="space-y-2.5 pt-2">
                          <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#A78BFA]">Relocation Metrics</div>
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-white/5 font-mono">
                            <div>
                              <span className="text-muted-foreground text-[10px]">Active Hotspots</span>
                              <p className="font-bold text-white mt-0.5">{recommended.length} Zones</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px]">Avg Yield</span>
                              <p className="font-bold text-[#10B981] mt-0.5">
                                ${recommended.length > 0 ? (recommended.reduce((sum, item) => sum + (item.predictedRevenueYield || 0), 0) / recommended.length).toFixed(0) : '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6">
                        <Button className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs h-9 gap-1.5 glow-purple">
                          Configure Relocation Rules
                          <ArrowUpRight className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB 3: SUPPLY DEFICITS & DRIVERS */}
                <TabsContent value="supply" className="space-y-6 outline-none">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* High Stockout Deficits Table */}
                    <Card className="xl:col-span-2 p-5 border border-white/5 bg-[#0D0E15]/50 shadow-xl rounded-2xl flex flex-col">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="size-4 text-[#EF4444]" />
                          High Stockout Probability Zones
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          Sectors at high risk of failing bookings due to driver shortages (under-supply)
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
                              <th className="pb-3 pl-2">Zone Name</th>
                              <th className="pb-3 text-center">Drivers Available</th>
                              <th className="pb-3 text-center">Predicted Deficit</th>
                              <th className="pb-3 text-right pr-2">Stockout Risk</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {highStockout.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                  {loading ? 'Calculating stockout scenarios...' : 'No deficits detected'}
                                </td>
                              </tr>
                            ) : (
                              highStockout.map((zone, idx) => {
                                const prob = zone.stockoutProbability ?? zone.calculatedStockoutProbability ?? 0
                                const riskColor = prob > 0.75 ? 'text-red-400 font-bold' : prob > 0.50 ? 'text-yellow-400' : 'text-emerald-400'
                                return (
                                  <tr key={idx} className="hover:bg-white/[0.01]">
                                    <td className="py-3 pl-2 font-medium text-white">{zone.zoneName}</td>
                                    <td className="py-3 text-center font-mono">{zone.availableDriversCount ?? zone.calculatedDeficit ?? 0}</td>
                                    <td className="py-3 text-center font-mono text-amber-400 font-medium">-{zone.deficitCount ?? zone.predictedDeficit ?? 0} units</td>
                                    <td className="py-3 text-right pr-2 font-mono">
                                      <span className={riskColor}>{(prob * 100).toFixed(0)}%</span>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Driver Status Pie Chart */}
                    <Card className="p-5 border border-white/5 bg-[#0D0E15]/50 shadow-xl rounded-2xl flex flex-col h-[380px]">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="size-4 text-[#38BDF8]" />
                          Active Driver Distribution
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          Proportional distribution of active drivers on the road by status
                        </p>
                      </div>

                      <div className="flex-1 min-h-0 flex items-center justify-center relative">
                        {driverStats.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            {loading ? 'Analyzing active fleet...' : 'No drivers active'}
                          </div>
                        ) : (
                          <>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={driverStats}
                                  cx="50%"
                                  cy="45%"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {driverStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: '#0D0E15',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    fontSize: 11
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>

                            {/* Legend */}
                            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-mono">
                              {driverStats.map((stat, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: stat.color }}
                                  />
                                  <span className="text-white">{stat.name}:</span>
                                  <span className="text-muted-foreground">{stat.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <StatusBar />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
