'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { StatusBar } from '@/components/status-bar'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

import { useAnalyticsSimulationStore } from '@/stores/use-analytics-simulation-store'
import { useSimulationEngineStore } from '@/stores/use-simulation-engine-store'
import { useLayoutStore } from '@/stores/use-layout-store'

import { SimulationMap } from '@/components/simulation-map'
import { SimulationCockpit } from '@/components/simulation-cockpit'
import { SimulationInputPanel } from '@/components/simulation-input-panel'
import { ComparisonCharts } from '@/components/comparison-charts'
import { KPIComparison } from '@/components/kpi-comparison'
import { RecommendedAction } from '@/components/recommended-action'

const ResponsiveGridLayout = dynamic(
  () => import('@/components/responsive-grid-layout'),
  { ssr: false }
) as React.ComponentType<any>

export default function SimulationAndDecisionEnginePage() {
  const vehicles = useAnalyticsSimulationStore((state) => state.vehicles)
  const fetchData = useAnalyticsSimulationStore((state) => state.fetchData)

  // Fetch live data on mount, then poll
  React.useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 15_000)
    return () => clearInterval(id)
  }, [fetchData])

  const input = useSimulationEngineStore((state) => state.input)
  const result = useSimulationEngineStore((state) => state.result)
  const isLoading = useSimulationEngineStore((state) => state.isLoading)
  const error = useSimulationEngineStore((state) => state.error)
  const setInput = useSimulationEngineStore((state) => state.setInput)
  const runSimulation = useSimulationEngineStore((state) => state.runSimulation)

  const layouts = useLayoutStore((state) => state.layouts)
  const saveLayout = useLayoutStore((state) => state.saveLayout)
  const resetLayout = useLayoutStore((state) => state.resetLayout)

  const [mounted, setMounted] = React.useState(false)
  const [simulationStatus, setSimulationStatus] = React.useState<'ready' | 'running' | 'completed' | 'error'>('ready')
  const [lastRunTime, setLastRunTime] = React.useState<string>()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (isLoading) {
      setSimulationStatus('running')
    } else if (error) {
      setSimulationStatus('error')
    } else if (result) {
      setSimulationStatus('completed')
      setLastRunTime(new Date().toLocaleTimeString())
    } else {
      setSimulationStatus('ready')
    }
  }, [isLoading, result, error])

  const handleSimulate = async () => {
    await runSimulation(input)
  }

  const handleResetLayout = () => {
    resetLayout()
    window.location.reload()
  }

  const handleLayoutChange = (layout: any, layouts: any) => {
    Object.keys(layouts).forEach((breakpoint) => {
      saveLayout(breakpoint, layouts[breakpoint])
    })
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-white/10 bg-card/30 backdrop-blur-xl px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/15 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                  <Sparkles className="size-4 text-violet-300" />
                  Advanced Mobility Intelligence
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    Future Mobility Simulation & Decision Hub
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    Interactive platform for demand forecasting, fleet optimization, and strategic decision-making using AI-powered counterfactual analysis.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-500/20">Deck.gl 3D</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-200 border-emerald-500/20">
                  {simulationStatus === 'running' ? 'Analyzing...' : 'Ready'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto px-4 py-5">
            {mounted ? (
              <ResponsiveGridLayout
                className="react-grid-layout"
                layouts={layouts}
                onLayoutChange={handleLayoutChange}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                width={1200}
                isResizable
                isDraggable
                compactType="vertical"
                preventCollision={false}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                useCSSTransforms={true}
              >
                {/* Simulation Cockpit */}
                <div key="cockpit" className="min-h-0">
                  <SimulationCockpit
                    isLoading={isLoading}
                    onReset={handleResetLayout}
                    status={simulationStatus}
                    lastRunTime={lastRunTime}
                  />
                </div>

                {/* 3D Simulation Map */}
                <div key="map" className="min-h-0">
                  <SimulationMap vehicles={vehicles} simulationResult={result} height="h-full" />
                </div>

                {/* Simulation Input Panel */}
                <div key="input" className="min-h-0">
                  <SimulationInputPanel
                    input={input}
                    onInputChange={setInput}
                    onSimulate={handleSimulate}
                    isLoading={isLoading}
                  />
                </div>

                {/* Comparison Charts */}
                <div key="comparison" className="min-h-0">
                  <ComparisonCharts result={result} isLoading={isLoading} />
                </div>

                {/* KPI Comparison */}
                <div key="kpi" className="min-h-0">
                  <KPIComparison result={result} isLoading={isLoading} />
                </div>

                {/* Recommended Action */}
                <div key="recommendation" className="min-h-0">
                  <RecommendedAction result={result} isLoading={isLoading} />
                </div>
              </ResponsiveGridLayout>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                  <p className="mt-4 text-muted-foreground">Initializing Simulation Engine...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <StatusBar />
      </SidebarInset>
    </SidebarProvider>
  )
}
