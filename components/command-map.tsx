'use client'

import * as React from 'react'
import { DeckGL } from '@deck.gl/react'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { PolygonLayer } from '@deck.gl/layers'
import { MapView, PickingInfo, MapViewState, FlyToInterpolator } from '@deck.gl/core'
import { createVehicleScenegraphLayer } from '@/components/vehicle-scenegraph-layer'
import {
  FleetVehicleData,
} from '@/lib/fleet-vehicle'
import MapGL from 'react-map-gl/maplibre'
import { cn } from '@/lib/utils'
import * as h3 from 'h3-js'
import { useTheme } from 'next-themes'
import type { MapZoneSelection, ZoneMapClickEvent } from '@/lib/dispatch-types'
import { formatZoneLabel } from '@/lib/nyc-zones'
import {
  buildFocusMaskPolygon,
  DEFAULT_DISPATCH_MAP_VIEW,
  getHexFitViewState,
  isVehicleInH3Zone,
} from '@/lib/h3-zone-utils'
import { fleetApi, type ApiZone, type ApiVehicle } from '@/lib/fleet-api'

const FOCUS_TRANSITION_MS = 900
const LINEAR_EASING = (t: number) => t

// Cyber-Purple heatmap palette — low demand fades into bg, peak demand burns neon red/pink
const NATURAL_HEATMAP_COLORS = [
  [32, 24, 52],     // level 1: dark matte violet (Minimal)
  [124, 58, 237],   // level 2: electric purple #7C3AED (Low)
  [167, 139, 250],  // level 3: lavender #A78BFA (Medium)
  [56, 189, 248],   // level 4: bright cyan #38BDF8 (High)
  [248, 113, 113],   // level 5: coral red #F87171 (Peak)
]

function interpolateColor(value: number, max: number): [number, number, number] {
  const fraction = Math.min(Math.max(value / max, 0), 1) * (NATURAL_HEATMAP_COLORS.length - 1)
  const index = Math.floor(fraction)
  const nextIndex = Math.min(index + 1, NATURAL_HEATMAP_COLORS.length - 1)
  const t = fraction - index

  const c1 = NATURAL_HEATMAP_COLORS[index]
  const c2 = NATURAL_HEATMAP_COLORS[nextIndex]

  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ]
}

// Supply-Demand Gap visualization scale
// Excess Supply (cyan) <---> Balanced (purple) <---> Excess Demand (coral red)
function getGapColor(gap: number): [number, number, number] {
  // gap ranges from -250 (excess supply) to +250 (excess demand)
  if (gap > 0) {
    // Interpolate between Balanced (purple) and Excess Demand (coral)
    const t = Math.min(gap / 250, 1)
    const c1 = [124, 58, 237] // purple #7C3AED
    const c2 = [248, 113, 113] // coral #F87171
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ]
  } else {
    // Interpolate between Balanced (purple) and Excess Supply (cyan)
    const t = Math.min(Math.abs(gap) / 250, 1)
    const c1 = [124, 58, 237] // purple #7C3AED
    const c2 = [6, 182, 212]  // cyan #06B6D4
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ]
  }
}

type HexDataType = {
  hex: string
  value: number   // Demand
  supply: number  // Supply
  gap: number     // Demand - Supply
  avgFare: number // From API
}

/** Build a HexDataType array from live ApiZone records. */
function apiZonesToHexData(zones: ApiZone[]): HexDataType[] {
  return zones.map((z) => {
    const hex = h3.latLngToCell(z.latitude, z.longitude, 8)
    const value = z.current_demand ?? 0
    const supply = z.current_drivers ?? 0
    return { hex, value, supply, gap: value - supply, avgFare: z.avg_fare ?? 0 }
  })
}

/** Fallback empty dataset — rendered while the real data loads. */
const EMPTY_HEX_DATA: HexDataType[] = []


export interface CommandMapProps {
  className?: string
  viewMode?: string
  showDemand?: boolean
  showFleet?: boolean
  showGap?: boolean
  /** Hide dashboard overlays — for embedded dispatch / heatmap panels. */
  embedded?: boolean
  /** H3 hex id — enables focus mode (mask, zoom, fleet filter). */
  highlightedZoneId?: string | null
  /** Animate camera to fit selected zone bounds. */
  focusZoneOnSelect?: boolean
  data?: FleetVehicleData[]
  /** Fired on hex click with cursor position (for context menu). */
  onZoneMapClick?: (event: ZoneMapClickEvent) => void
  onSelectZone?: (zone: MapZoneSelection) => void
  simulationData?: any[]
  cachedZones?: ApiZone[]
}

export function CommandMap({ 
  className, 
  viewMode = 'realtime', 
  showDemand = true,
  showFleet = false, 
  showGap = false,
  embedded = false,
  highlightedZoneId = null,
  focusZoneOnSelect = false,
  data: fleetData,
  onZoneMapClick,
  onSelectZone,
  simulationData,
  cachedZones,
}: CommandMapProps) {
  const isFocusMode = Boolean(highlightedZoneId && focusZoneOnSelect)

  // ── Live hex data from API ─────────────────────────────────────────────────
  const [data, setData] = React.useState<HexDataType[]>(EMPTY_HEX_DATA)
  const [predictiveData, setPredictiveData] = React.useState<HexDataType[]>(EMPTY_HEX_DATA)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const heatmap = await fleetApi.zones.getHeatmap()
        if (cancelled) return
        
        const live = heatmap.map((p) => {
          const hex = h3.latLngToCell(p.latitude, p.longitude, 8)
          const value = p.tripCount ?? p.calculatedTripCount ?? 0
          const surge = p.surgeMultiplier || 1.0
          const supply = Math.max(0, Math.round(value / surge))
          return {
            hex,
            value,
            supply,
            gap: value - supply,
            avgFare: 15.0 * surge,
          }
        })
        setData(live)

        const predictive = heatmap.map((p) => {
          const hex = h3.latLngToCell(p.latitude, p.longitude, 8)
          const value = p.predictedTripCount ?? 0
          const surge = p.surgeMultiplier || 1.0
          const supply = Math.max(0, Math.round(value / surge))
          return {
            hex,
            value,
            supply,
            gap: value - supply,
            avgFare: 15.0 * surge,
          }
        })
        setPredictiveData(predictive)
      } catch {
        // Silent — map renders empty until next poll
      }
    }
    load()
    const id = setInterval(load, 15_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // ── Live fleet positions from API ──────────────────────────────────────────
  const [liveFleet, setLiveFleet] = React.useState<FleetVehicleData[]>([])

  React.useEffect(() => {
    if (fleetData) return // external data takes precedence
    let cancelled = false
    const load = async () => {
      try {
        const vehicles = await fleetApi.vehicles.getAll()
        if (cancelled) return
        setLiveFleet(
          vehicles.map((v: ApiVehicle) => ({
            id: v.vehicle_id,
            latitude: v.latitude,
            longitude: v.longitude,
            bearing: v.heading,
          }))
        )
      } catch {
        // Silent
      }
    }
    load()
    const id = setInterval(load, 5_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [fleetData])

  const allFleet: FleetVehicleData[] = React.useMemo(
    () => fleetData ?? liveFleet,
    [fleetData, liveFleet]
  )

  const visibleFleet = React.useMemo(() => {
    if (!isFocusMode || !highlightedZoneId || !showFleet) return allFleet
    return allFleet.filter((t) =>
      isVehicleInH3Zone(t.latitude, t.longitude, highlightedZoneId)
    )
  }, [allFleet, highlightedZoneId, isFocusMode, showFleet])

  const focusMaskData = React.useMemo(() => {
    if (!isFocusMode || !highlightedZoneId) return []
    return [buildFocusMaskPolygon(highlightedZoneId)]
  }, [isFocusMode, highlightedZoneId])

  const { resolvedTheme } = useTheme()
  const [opacity, setOpacity] = React.useState(75)
  const [hoveredHex, setHoveredHex] = React.useState<HexDataType | null>(null)

  const [viewState, setViewState] = React.useState<MapViewState>(
    embedded ? DEFAULT_DISPATCH_MAP_VIEW : {
      longitude: -74.0060,
      latitude: 40.7128,
      zoom: 11.2,
      pitch: 48,
      bearing: -15,
    }
  )

  const lastInteraction = React.useRef(Date.now())
  const prevFocusHex = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!focusZoneOnSelect) return

    if (highlightedZoneId) {
      const fit = getHexFitViewState(highlightedZoneId)
      lastInteraction.current = Date.now() + 120_000
      setViewState((v) => ({
        ...v,
        ...fit,
        transitionDuration: FOCUS_TRANSITION_MS,
        transitionInterpolator: new FlyToInterpolator(),
      }))
    } else if (prevFocusHex.current) {
      setViewState({
        ...DEFAULT_DISPATCH_MAP_VIEW,
        transitionDuration: FOCUS_TRANSITION_MS,
        transitionInterpolator: new FlyToInterpolator(),
      })
    }

    prevFocusHex.current = highlightedZoneId ?? null
  }, [highlightedZoneId, focusZoneOnSelect])

  // Camera auto-orbit (pauses when user interacts)
  React.useEffect(() => {
    let animFrameId: number
    let lastTime = performance.now()

    const updateMap = (time: number) => {
      const delta = (time - lastTime) / 1000
      lastTime = time

      if (!isFocusMode && Date.now() - lastInteraction.current > 5000) {
        setViewState((v) => ({
          ...v,
          bearing: (v.bearing || 0) + delta * 1.5,
        }))
      }

      animFrameId = requestAnimationFrame(updateMap)
    }

    animFrameId = requestAnimationFrame(updateMap)
    return () => cancelAnimationFrame(animFrameId)
  }, [isFocusMode])

  const handleViewStateChange = React.useCallback(({ viewState: nextViewState, interactionState }: any) => {
    // Record interaction if user is actively touching/dragging the map
    if (interactionState.isDragging || interactionState.isPanning || interactionState.isZooming || interactionState.isRotating) {
      lastInteraction.current = Date.now()
    }
    setViewState(nextViewState)
  }, [])

  const isPredictive = viewMode === 'predictive'
  const isSimulation = viewMode === 'simulation'

  const simulationHexData = React.useMemo(() => {
    if (!simulationData || !cachedZones || cachedZones.length === 0) return []
    const zoneMap = new Map(cachedZones.map(z => [z.zoneId, z]))
    return simulationData.map((s) => {
      const zone = zoneMap.get(Number(s.zoneId))
      if (!zone) return null
      const hex = h3.latLngToCell(zone.latitude, zone.longitude, 8)
      const value = s.demand ?? 0
      const supply = s.driverCount ?? 0
      return {
        hex,
        value,
        supply,
        gap: value - supply,
        avgFare: s.revenue / Math.max(1, s.activeTrips),
      }
    }).filter(Boolean) as HexDataType[]
  }, [simulationData, cachedZones])

  const activeHexData = isSimulation ? simulationHexData : (isPredictive ? predictiveData : data)

  // DeckGL H3 layer configurations with dynamic live states
  const layers = [
    new H3HexagonLayer<HexDataType>({
      id: 'h3-layer',
      data: activeHexData,
      visible: showDemand || showGap,
      pickable: true,
      stroked: true,
      filled: true,
      // 3D Extruded Heights enabled!
      extruded: true,
      elevationScale: 10,
      coverage: 0.82,
      material: {
        ambient: 0.5,
        diffuse: 0.6,
        shininess: 32,
        specularColor: resolvedTheme === 'light' ? [150, 150, 150] : [255, 255, 255]
      },
      getHexagon: (d: HexDataType) => d.hex,
      // Dynamic colors based on overlay toggles
      getFillColor: (d: HexDataType) => {
        const isSelected = d.hex === highlightedZoneId
        const baseColor = showGap ? getGapColor(d.gap) : interpolateColor(d.value, 500)

        if (isFocusMode && !isSelected) {
          return [14, 10, 22, 50]
        }
        if (isSelected) {
          const glow = showGap ? getGapColor(d.gap) : interpolateColor(d.value, 500)
          return [...glow, 255]
        }

        const alpha = Math.round(opacity * 2.55)
        return [...baseColor, alpha]
      },
      getElevation: (d: HexDataType) => {
        if (isFocusMode && d.hex !== highlightedZoneId) return 0
        if (isFocusMode && d.hex === highlightedZoneId) {
          const base = showGap ? Math.abs(d.gap) : d.value
          return base * 1.15
        }
        return showGap ? Math.abs(d.gap) : d.value
      },
      getLineColor: (d: HexDataType) => {
        if (d.hex === highlightedZoneId) {
          return [167, 139, 250, 255]
        }
        return resolvedTheme === 'light' ? [15, 23, 42, 15] : [255, 255, 255, 30]
      },
      getLineWidth: (d: HexDataType) => (d.hex === highlightedZoneId ? 3 : 1),
      lineWidthMinPixels: 1,
      updateTriggers: {
        getFillColor: [isPredictive, isSimulation, opacity, showGap, highlightedZoneId, isFocusMode],
        getElevation: [isPredictive, isSimulation, showGap, isFocusMode, highlightedZoneId],
        getLineColor: [highlightedZoneId, resolvedTheme, isFocusMode],
        getLineWidth: [highlightedZoneId, isFocusMode],
        data: [isPredictive, isSimulation, activeHexData],
      },
      transitions: {
        getElevation: FOCUS_TRANSITION_MS,
        getFillColor: FOCUS_TRANSITION_MS,
      },
      onHover: ({ object }) => {
        setHoveredHex(object as HexDataType | null)
      },
      onClick: (info) => {
        const { object, coordinate, x, y } = info
        if (object && coordinate != null && x != null && y != null) {
          const zone: MapZoneSelection = {
            zoneId: object.hex,
            zone: formatZoneLabel(object.hex),
            trips: Math.floor(object.value),
            avgFare: object.avgFare?.toFixed(2) ?? '0.00',
            supply: Math.floor(object.supply),
            gap: Math.floor(object.gap),
          }

          onZoneMapClick?.({ zone, position: { x, y } })
          onSelectZone?.(zone)

          if (!focusZoneOnSelect) {
            setViewState((v: MapViewState) => ({
              ...v,
              longitude: coordinate[0],
              latitude: coordinate[1],
              zoom: 12.8,
              pitch: 52,
              bearing: (v.bearing || 0) + 15,
              transitionDuration: FOCUS_TRANSITION_MS,
              transitionInterpolator: new FlyToInterpolator(),
            }))
          }
          lastInteraction.current = Date.now()
        }
      }
    }),

    ...(isFocusMode && focusMaskData.length > 0
      ? [
          new PolygonLayer({
            id: 'focus-vignette-mask',
            data: focusMaskData,
            pickable: false,
            stroked: false,
            filled: true,
            wireframe: false,
            getPolygon: (d) => d.polygon,
            getFillColor: [4, 2, 12, 210],
            transitions: {
              getFillColor: { duration: FOCUS_TRANSITION_MS, easing: LINEAR_EASING },
            },
            updateTriggers: {
              getPolygon: [highlightedZoneId],
            },
          }),
        ]
      : []),

    createVehicleScenegraphLayer({
      id: 'fleet-3d-layer',
      data: visibleFleet,
      visible: showFleet,
      pickable: true,
      transitionMs: isFocusMode ? FOCUS_TRANSITION_MS : fleetData ? 320 : 0,
    }),
  ]

  // Theme-aware Base Map Swap!
  const mapStyle = resolvedTheme === 'light'
    ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

  return (
    <div className={cn(
      "relative w-full h-full overflow-hidden rounded-xl border border-border shadow-2xl transition-colors duration-500 bg-background theme-transition",
      className
    )}>
      <DeckGL
        views={new MapView({ id: 'map', controller: { dragRotate: true, doubleClickZoom: true } })}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        layers={layers}
        getTooltip={({ object }: PickingInfo<any>) =>
          object && object.hex ? {
            html: `
              <div class="p-3 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl bg-[#0d0e15]/92 text-white select-none">
                <div class="text-[9px] font-mono font-bold uppercase tracking-widest mb-1 text-[#A78BFA]">Sector Metrics</div>
                <div class="text-lg font-black font-mono">ID: ${object.hex.slice(-6).toUpperCase()}</div>
                <div class="mt-2 space-y-1 text-[10px] font-mono">
                  <div class="flex justify-between gap-4"><span class="opacity-60 text-white">DEMAND (IN):</span> <span class="text-[#A78BFA] font-black">${Math.floor(object.value)} units</span></div>
                  <div class="flex justify-between gap-4"><span class="opacity-60 text-white">SUPPLY (FLEET):</span> <span class="text-[#38BDF8] font-black">${Math.floor(object.supply)} taxis</span></div>
                  <div class="flex justify-between gap-4 border-t border-white/5 pt-1 mt-1">
                    <span class="opacity-60 text-white">GAP (S-D):</span> 
                    <span class="font-black ${object.gap > 0 ? 'text-[#F87171]' : 'text-[#06B6D4]'}">
                      ${object.gap > 0 ? `+${Math.floor(object.gap)} (Surge)` : `${Math.floor(object.gap)} (Surplus)`}
                    </span>
                  </div>
                </div>
              </div>
            `,
            style: { backgroundColor: 'transparent', padding: '0' }
          } : null
        }
      >
        <MapGL
          mapStyle={mapStyle}
          reuseMaps
        />
      </DeckGL>

      {!embedded && (
      <>
      {/* Floating Card A: OPERATIONS MONITOR */}
      <div className="absolute top-6 left-6 z-20 space-y-4 pointer-events-none">
        <div className="p-4 glass rounded-xl w-72 pointer-events-auto transition-all select-none shadow-lg theme-transition">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest mb-3 text-primary">OPERATIONS MONITOR</div>
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-3xl font-black text-foreground tracking-tight">1,402</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">ACTIVE FLEET</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-success font-mono bg-success/10 px-2 py-0.5 rounded border border-success/20 shadow-[0_0_8px_rgba(74,222,128,0.2)]">98.2% UPTIME</div>
            </div>
          </div>
          
          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">DEMAND INTENSITY</span>
              <span className="text-[9px] text-accent font-mono font-bold">PEAK STAGE</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
              <div className="h-full bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#38BDF8] w-[75%] shadow-[0_0_10px_rgba(56,189,248,0.3)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Card B: HEATMAP LEGEND */}
      <div className="absolute bottom-6 left-6 z-20 p-4 glass rounded-xl pointer-events-auto text-foreground transition-all w-60 select-none shadow-lg theme-transition">
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] mb-3 text-primary">
          {showGap ? 'SUPPLY-DEMAND GAP' : 'PASSENGER DEMAND'}
        </div>
        
        {showGap ? (
          <div className="space-y-2">
            <div className="h-3 w-full bg-gradient-to-r from-[#06B6D4] via-[#7C3AED] to-[#F87171] rounded-md border border-border" />
            <div className="flex justify-between text-[8px] uppercase font-bold tracking-wider text-muted-foreground">
              <span className="text-[#06B6D4]">Fleet Surplus</span>
              <span>Balanced</span>
              <span className="text-[#F87171]">Surge Demand</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-1.5">
              {NATURAL_HEATMAP_COLORS.map((color, i) => (
                <div
                  key={i}
                  className="size-3.5 rounded-full border border-border shadow-[0_0_6px_rgba(255,255,255,0.05)] transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: `rgb(${color.join(',')})`,
                    boxShadow: i === 4 ? '0 0 8px rgba(248,113,113,0.5)' : i === 3 ? '0 0 8px rgba(56,189,248,0.5)' : 'none'
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2.5 text-[8px] uppercase font-bold tracking-wider text-muted-foreground">
              <span>Minimal</span>
              <span className="text-[#F87171]">Peak Demand</span>
            </div>
          </div>
        )}
      </div>

      </>
      )}
    </div>
  )
}
