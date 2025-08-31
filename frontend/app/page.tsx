"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Navigation, RotateCcw, Clock, Route, ZoomIn, ZoomOut } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Location {
  lat: number
  lng: number
  name: string
  x?: number
  y?: number
}

interface RouteResult {
  distance: number
  duration: number
  coordinates: [number, number][]
}

interface TransportMode {
  id: string
  name: string
  icon: string
  color: string
  profile: string
}

const transportModes: TransportMode[] = [
  { id: "walking", name: "Walking", icon: "🚶", color: "#22c55e", profile: "foot-walking" },
  { id: "biking", name: "Biking", icon: "🚴", color: "#3b82f6", profile: "cycling-regular" },
  { id: "driving", name: "Driving", icon: "🚗", color: "#ef4444", profile: "driving-car" },
]

// Custom Map Component
function CustomMap({
  startLocation,
  endLocation,
  route,
  selectedMode,
}: {
  startLocation: Location | null
  endLocation: Location | null
  route: RouteResult | null
  selectedMode: string
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const mapWidth = 800
  const mapHeight = 600

  // Convert lat/lng to SVG coordinates
  const latLngToSVG = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * mapWidth
    const y = ((90 - lat) / 180) * mapHeight
    return { x, y }
  }

  // Update location coordinates when locations change
  useEffect(() => {
    if (startLocation) {
      const coords = latLngToSVG(startLocation.lat, startLocation.lng)
      startLocation.x = coords.x
      startLocation.y = coords.y
    }
    if (endLocation) {
      const coords = latLngToSVG(endLocation.lat, endLocation.lng)
      endLocation.x = coords.x
      endLocation.y = coords.y
    }
  }, [startLocation, endLocation])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const selectedTransportMode = transportModes.find((m) => m.id === selectedMode)

  return (
    <div className="relative w-full h-full bg-blue-50 rounded-lg overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button size="sm" variant="secondary" onClick={() => setZoom(Math.min(zoom * 1.2, 3))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        }}
      >
        {/* Grid Background */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Water bodies (decorative) */}
        <circle cx="200" cy="150" r="80" fill="#bfdbfe" opacity="0.6" />
        <circle cx="600" cy="400" r="60" fill="#bfdbfe" opacity="0.6" />

        {/* Roads (decorative) */}
        <path d="M0,200 Q200,180 400,200 T800,220" stroke="#d1d5db" strokeWidth="8" fill="none" />
        <path d="M200,0 Q220,200 240,400 T260,600" stroke="#d1d5db" strokeWidth="6" fill="none" />
        <path d="M0,400 Q300,380 600,400 T800,420" stroke="#d1d5db" strokeWidth="6" fill="none" />

        {/* Route Line */}
        {route &&
          startLocation &&
          endLocation &&
          startLocation.x &&
          startLocation.y &&
          endLocation.x &&
          endLocation.y && (
            <line
              x1={startLocation.x}
              y1={startLocation.y}
              x2={endLocation.x}
              y2={endLocation.y}
              stroke={selectedTransportMode?.color || "#3b82f6"}
              strokeWidth="4"
              strokeDasharray={selectedMode === "walking" ? "5,5" : selectedMode === "biking" ? "10,5" : "none"}
              opacity="0.8"
            />
          )}

        {/* Start Location Marker */}
        {startLocation && startLocation.x && startLocation.y && (
          <g>
            <circle cx={startLocation.x} cy={startLocation.y} r="12" fill="#22c55e" stroke="white" strokeWidth="3" />
            <text
              x={startLocation.x}
              y={startLocation.y - 20}
              textAnchor="middle"
              className="text-sm font-medium fill-gray-700"
            >
              Start
            </text>
          </g>
        )}

        {/* End Location Marker */}
        {endLocation && endLocation.x && endLocation.y && (
          <g>
            <circle cx={endLocation.x} cy={endLocation.y} r="12" fill="#ef4444" stroke="white" strokeWidth="3" />
            <text
              x={endLocation.x}
              y={endLocation.y - 20}
              textAnchor="middle"
              className="text-sm font-medium fill-gray-700"
            >
              End
            </text>
          </g>
        )}
      </svg>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-medium mb-2">Map Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Start Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>End Location</span>
          </div>
          {route && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded" style={{ backgroundColor: selectedTransportMode?.color }}></div>
              <span>Route</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TransportPlanner() {
  const [startInput, setStartInput] = useState("")
  const [endInput, setEndInput] = useState("")
  const [startLocation, setStartLocation] = useState<Location | null>(null)
  const [endLocation, setEndLocation] = useState<Location | null>(null)
  const [selectedMode, setSelectedMode] = useState("walking")
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Mock geocoding function (replace with real API)
  const geocodeLocation = async (address: string): Promise<Location | null> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Mock locations for demo
    const mockLocations: { [key: string]: Location } = {
      london: { lat: 51.5074, lng: -0.1278, name: "London, UK" },
      paris: { lat: 48.8566, lng: 2.3522, name: "Paris, France" },
      "new york": { lat: 40.7128, lng: -74.006, name: "New York, USA" },
      tokyo: { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan" },
      sydney: { lat: -33.8688, lng: 151.2093, name: "Sydney, Australia" },
      berlin: { lat: 52.52, lng: 13.405, name: "Berlin, Germany" },
      madrid: { lat: 40.4168, lng: -3.7038, name: "Madrid, Spain" },
      rome: { lat: 41.9028, lng: 12.4964, name: "Rome, Italy" },
    }

    const key = address.toLowerCase()
    if (mockLocations[key]) {
      return mockLocations[key]
    }

    // Generate random location for unknown addresses
    return {
      lat: 51.5 + (Math.random() - 0.5) * 0.2,
      lng: -0.1 + (Math.random() - 0.5) * 0.4,
      name: address,
    }
  }

  // Mock route calculation
  const calculateRoute = async () => {
    if (!startLocation || !endLocation) return

    setLoading(true)
    setError("")

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Calculate distance using Haversine formula
      const R = 6371 // Earth's radius in km
      const dLat = ((endLocation.lat - startLocation.lat) * Math.PI) / 180
      const dLng = ((endLocation.lng - startLocation.lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((startLocation.lat * Math.PI) / 180) *
          Math.cos((endLocation.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c * 1000 // Convert to meters

      // Calculate duration based on transport mode
      let speed = 5 // km/h for walking
      if (selectedMode === "biking") speed = 15
      if (selectedMode === "driving") speed = 50

      const duration = (distance / 1000 / speed) * 3600 // Convert to seconds

      setRoute({
        distance,
        duration,
        coordinates: [
          [startLocation.lng, startLocation.lat],
          [endLocation.lng, endLocation.lat],
        ],
      })
    } catch (error) {
      setError("Failed to calculate route. Please try again.")
      console.error("Route calculation error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSearch = async (type: "start" | "end") => {
    const input = type === "start" ? startInput : endInput
    if (!input.trim()) return

    setLoading(true)
    const location = await geocodeLocation(input)

    if (location) {
      if (type === "start") {
        setStartLocation(location)
      } else {
        setEndLocation(location)
      }
    } else {
      setError(`Could not find location: ${input}`)
    }
    setLoading(false)
  }

  const resetPlanner = () => {
    setStartInput("")
    setEndInput("")
    setStartLocation(null)
    setEndLocation(null)
    setRoute(null)
    setError("")
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const selectedTransportMode = transportModes.find((m) => m.id === selectedMode)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🌱 Sustainable Transport Planner</h1>
          <p className="text-lg text-gray-600">Plan eco-friendly routes and compare different transport methods</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Route Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Location</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Try: London, Paris, New York..."
                      value={startInput}
                      onChange={(e) => setStartInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLocationSearch("start")}
                    />
                    <Button
                      onClick={() => handleLocationSearch("start")}
                      disabled={loading || !startInput.trim()}
                      size="icon"
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                  {startLocation && (
                    <Badge variant="secondary" className="text-xs">
                      📍 {startLocation.name}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Location</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Try: Berlin, Tokyo, Sydney..."
                      value={endInput}
                      onChange={(e) => setEndInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLocationSearch("end")}
                    />
                    <Button
                      onClick={() => handleLocationSearch("end")}
                      disabled={loading || !endInput.trim()}
                      size="icon"
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>
                  {endLocation && (
                    <Badge variant="secondary" className="text-xs">
                      📍 {endLocation.name}
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Transport Mode</label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transportModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>
                          <div className="flex items-center gap-2">
                            <span>{mode.icon}</span>
                            <span>{mode.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={calculateRoute}
                    disabled={loading || !startLocation || !endLocation}
                    className="flex-1"
                  >
                    <Route className="h-4 w-4 mr-2" />
                    {loading ? "Calculating..." : "Calculate Route"}
                  </Button>
                  <Button onClick={resetPlanner} variant="outline" size="icon">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Route Results */}
            {route && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{selectedTransportMode?.icon}</span>
                    Route Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{formatDistance(route.distance)}</div>
                      <div className="text-sm text-gray-600">Distance</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                        <Clock className="h-5 w-5" />
                        {formatDuration(route.duration)}
                      </div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">🌱 Environmental Impact</div>
                    <div className="text-xs text-green-700">
                      {selectedMode === "walking" && "Zero emissions! Great choice for the environment."}
                      {selectedMode === "biking" && "Eco-friendly transport with minimal environmental impact."}
                      {selectedMode === "driving" &&
                        "Consider walking or biking for shorter distances to reduce emissions."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <CustomMap
                  startLocation={startLocation}
                  endLocation={endLocation}
                  route={route}
                  selectedMode={selectedMode}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
