"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MapPin, RotateCcw, Route } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import dynamic from "next/dynamic"
import MapboxMap from "@/components/MapboxMap"
const LocationAutocomplete = dynamic(() => import("@/components/LocationAutocomplete"), { ssr: false })
import { EmissionsDisplay } from "@/components/EmissionsDisplay"

// Import API functions
import { calculateMultipleRoutes, compareTransportModes } from "@/lib/api"
import type { Location, RouteResult, RouteMetrics, TransportProfile, TransportModeId } from "@/lib/api"

interface TransportMode {
  id: string
  name: string
  icon: string
  color: string
  profile: TransportProfile
  isAerial?: boolean
}

const transportModes: TransportMode[] = [
  { id: "walking", name: "Walking", icon: "🚶", color: "#22c55e", profile: "mapbox/walking" },
  { id: "cycling", name: "Cycling", icon: "🚴", color: "#3b82f6", profile: "mapbox/cycling" },
  { id: "driving", name: "Driving", icon: "🚗", color: "#ef4444", profile: "mapbox/driving" },
  { id: "transit", name: "Bus / Transit", icon: "🚌", color: "#8b5cf6", profile: "mapbox/driving" },
  { id: "evtol", name: "eVTOL Air Taxi", icon: "✈️", color: "#0ea5e9", profile: "mapbox/driving", isAerial: true },
]

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface RouteWithMetrics {
  mode: TransportMode;
  route?: RouteResult;
  metrics?: RouteMetrics;
  success: boolean;
  error?: string;
}

export default function TransportPlanner() {
  const [startInput, setStartInput] = useState("")
  const [endInput, setEndInput] = useState("")
  const [startLocation, setStartLocation] = useState<Location | null>(null)
  const [endLocation, setEndLocation] = useState<Location | null>(null)
  const [routes, setRoutes] = useState<RouteWithMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Handle location selection from autocomplete
  const handleStartLocationSelect = (location: Location | null) => {
    setStartLocation(location);
  };

  const handleEndLocationSelect = (location: Location | null) => {
    setEndLocation(location);
  };

  // Parse location context from Mapbox location data
  const parseLocationContext = (location: Location | null): { country?: string; region?: string } | undefined => {
    if (!location?.context || location.context.length === 0) {
      return undefined;
    }

    let country: string | undefined;
    let region: string | undefined;

    for (const item of location.context) {
      // Country context items have id like "country.xxx"
      if (item.id.startsWith('country.')) {
        country = item.short_code?.toUpperCase().replace('US-', '').replace('GB-', '') || 
                  item.id.split('.')[1]?.substring(0, 2).toUpperCase();
      }
      // Region context items (states, provinces) have id like "region.xxx"
      else if (item.id.startsWith('region.')) {
        region = item.text;
      }
    }

    return country ? { country, region } : undefined;
  };

  // Calculate routes for all transport modes
  const calculateAllRoutes = async () => {
    if (!startLocation || !endLocation) {
      setError("Please select both start and end locations from the suggestions")
      return
    }

    setLoading(true)
    setError("")
    setRoutes([])

    try {
      const locationContext = parseLocationContext(startLocation)
      const groundModes = transportModes.filter(m => !m.isAerial)

      // Ground routes via Mapbox
      const profiles = groundModes.map(m => m.profile)
      const routeResponse = await calculateMultipleRoutes(startLocation, endLocation, profiles)

      if (!routeResponse.success) {
        throw new Error(routeResponse.error || 'Failed to calculate routes')
      }

      // Aerial routes: straight-line distance + speed-based duration
      const aerialDistanceM = haversineDistance(startLocation.lat, startLocation.lng, endLocation.lat, endLocation.lng)
      const EVTOL_SPEED_MS = 89.44 // 322 km/h in m/s (Joby S4 cruise speed)
      const aerialDurationS = Math.round(aerialDistanceM / EVTOL_SPEED_MS) + 120 // +2 min for takeoff/landing hover

      const routeResults: RouteWithMetrics[] = await Promise.all(
        transportModes.map(async (mode) => {
          if (mode.isAerial) {
            const syntheticRoute: RouteResult = {
              distance: aerialDistanceM,
              duration: aerialDurationS,
              coordinates: [[startLocation.lng, startLocation.lat], [endLocation.lng, endLocation.lat]]
            }
            try {
              const metricsResponse = await compareTransportModes(
                aerialDistanceM,
                [mode.id as TransportModeId],
                aerialDurationS,
                locationContext
              )
              const metrics = metricsResponse.success && metricsResponse.comparison?.[0]
                ? metricsResponse.comparison[0]
                : undefined
              return { mode, route: syntheticRoute, metrics, success: true }
            } catch {
              return { mode, route: syntheticRoute, success: true, error: 'Metrics calculation failed' }
            }
          }

          // Ground mode
          const routeData = routeResponse.routes.find(r => r.profile === mode.profile)

          if (!routeData || !routeData.success || !routeData.data) {
            return {
              mode,
              success: false,
              error: routeData?.error || 'Route calculation failed'
            }
          }

          try {
            const metricsResponse = await compareTransportModes(
              routeData.data.distance,
              [mode.id as TransportModeId],
              routeData.data.duration,
              locationContext
            )
            const metrics = metricsResponse.success && metricsResponse.comparison?.[0]
              ? metricsResponse.comparison[0]
              : undefined
            return { mode, route: routeData.data, metrics, success: true }
          } catch {
            return { mode, route: routeData.data, success: true, error: 'Metrics calculation failed' }
          }
        })
      )

      setRoutes(routeResults)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Route calculation error:', error)
    } finally {
      setLoading(false)
    }
  }


  const resetPlanner = () => {
    setStartInput("")
    setEndInput("")
    setStartLocation(null)
    setEndLocation(null)
    setRoutes([])
    setError("")
  }

  const formatDistance = (meters: number) => {
    const feet = meters * 3.28084
    const miles = meters * 0.000621371
    
    if (feet < 5280) { // Less than 1 mile
      return `${Math.round(feet)} ft`
    }
    return `${miles.toFixed(1)} mi`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const generateGoogleMapsUrl = (startLoc: Location, endLoc: Location, mode: string) => {
    const baseUrl = 'https://www.google.com/maps/dir/'
    const origin = `${startLoc.lat},${startLoc.lng}`
    const destination = `${endLoc.lat},${endLoc.lng}`
    
    // Map our transport modes to Google Maps travel modes
    const travelMode = mode === 'walking' ? 'walking' 
                    : mode === 'cycling' ? 'bicycling'
                    : mode === 'driving' ? 'driving' 
                    : 'transit' // fallback for other modes
    
    return `${baseUrl}${origin}/${destination}/@${startLoc.lat},${startLoc.lng},12z/data=!3m1!4b1!4m2!4m1!3e${
      travelMode === 'walking' ? '2' : 
      travelMode === 'bicycling' ? '1' : 
      travelMode === 'driving' ? '0' : '3'
    }`
  }

  const bestRoute = routes.find(r => r.success && r.route)
  const successfulRoutes = routes.filter(r => r.success && r.route)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🌱 Sustainable Transport Planner</h1>
          <p className="text-lg text-gray-600">Plan eco-friendly routes and compare different transport methods</p>
        </div>

        <div className="space-y-6">
          {/* Top: form + map */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Plan Your Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Location</label>
                    <LocationAutocomplete
                      placeholder="Enter start location..."
                      value={startInput}
                      onChange={setStartInput}
                      onLocationSelect={handleStartLocationSelect}
                      selectedLocation={startLocation}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Location</label>
                    <LocationAutocomplete
                      placeholder="Enter destination..."
                      value={endInput}
                      onChange={setEndInput}
                      onLocationSelect={handleEndLocationSelect}
                      selectedLocation={endLocation}
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      onClick={calculateAllRoutes}
                      disabled={loading || !startLocation || !endLocation}
                      className="flex-1"
                    >
                      <Route className="h-4 w-4 mr-2" />
                      {loading ? "Calculating All Routes..." : "Calculate All Routes"}
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
            </div>

            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="h-[600px]">
                <CardContent className="p-0 h-full">
                  <MapboxMap
                    startLocation={startLocation}
                    endLocation={endLocation}
                    route={bestRoute?.route || null}
                    selectedMode={bestRoute?.mode.id || 'walking'}
                    className="w-full h-full"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom: results grid */}
          {successfulRoutes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((routeData) => (
                <Card key={routeData.mode.id} className={`${routeData.success ? '' : 'opacity-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{routeData.mode.icon}</span>
                        <span>{routeData.mode.name}</span>
                      </div>
                      {routeData.success && startLocation && endLocation && !routeData.mode.isAerial && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(generateGoogleMapsUrl(startLocation, endLocation, routeData.mode.id), '_blank')}
                          className="text-xs"
                        >
                          Open in Maps
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {routeData.success && routeData.route ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">
                              {formatDistance(routeData.route.distance)}
                            </div>
                            <div className="text-xs text-gray-600">Distance</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-900">
                              {formatDuration(routeData.route.duration)}
                            </div>
                            <div className="text-xs text-gray-600">Duration</div>
                          </div>
                        </div>

                        {routeData.metrics && (
                          <div className="grid grid-cols-1 gap-3">
                            <EmissionsDisplay
                              emissions={routeData.metrics.carbonEmissions}
                              mode={routeData.mode.id}
                            />

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-xs font-medium text-blue-800">💰 Est. Cost</div>
                              <div className="text-sm font-bold text-blue-700">
                                {routeData.metrics.costRange && routeData.mode.id === 'driving' ? (
                                  <>
                                    ${routeData.metrics.costRange.min.toFixed(2)} - ${routeData.metrics.costRange.max.toFixed(2)}
                                    <div className="text-[10px] font-normal text-blue-600 mt-0.5">
                                      Avg: ${routeData.metrics.costRange.average.toFixed(2)}
                                    </div>
                                  </>
                                ) : (
                                  `$${routeData.metrics.estimatedCost.toFixed(2)}`
                                )}
                              </div>
                            </div>

                            {routeData.metrics.calories && (
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="text-xs font-medium text-purple-800">🔥 Calories</div>
                                <div className="text-sm font-bold text-purple-700">
                                  ~{routeData.metrics.calories} cal
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-red-600">
                        {routeData.error || 'Route calculation failed'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}