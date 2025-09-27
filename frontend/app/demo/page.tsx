"use client"

import { EmissionsDisplay } from '@/components/EmissionsDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EmissionsDemo() {
  // Mock data to demonstrate the emissions display
  const demoRoutes = [
    { mode: 'walking', emissions: 0, distance: '1.2 km', time: '15 min' },
    { mode: 'cycling', emissions: 0, distance: '1.2 km', time: '5 min' },
    { mode: 'driving', emissions: 0.216, distance: '1.2 km', time: '4 min' },
    { mode: 'transit', emissions: 0.107, distance: '1.2 km', time: '8 min' },
  ]

  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      walking: '🚶',
      cycling: '🚴', 
      driving: '🚗',
      transit: '🚌'
    }
    return icons[mode] || '🚶'
  }

  const getModeName = (mode: string) => {
    const names: Record<string, string> = {
      walking: 'Walking',
      cycling: 'Cycling',
      driving: 'Driving', 
      transit: 'Public Transit'
    }
    return names[mode] || mode
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🌱 Carbon Emissions Calculator Demo</h1>
          <p className="text-lg text-gray-600">Enhanced with detailed methodology and sources</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {demoRoutes.map((route, index) => (
            <Card key={index} className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{getModeIcon(route.mode)}</span>
                  {getModeName(route.mode)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold">{route.distance}</div>
                    <div className="text-gray-600 text-xs">Distance</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold">{route.time}</div>
                    <div className="text-gray-600 text-xs">Duration</div>
                  </div>
                </div>
                
                {/* This is the enhanced emissions display with tooltip */}
                <EmissionsDisplay 
                  emissions={route.emissions}
                  mode={route.mode}
                />
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-800">💰 Est. Cost</div>
                  <div className="text-sm font-bold text-blue-700">
                    ${(route.emissions * 2.5).toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-4">What's New in Carbon Emissions Calculations</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">🔬 Enhanced Methodology</h3>
              <p>Updated car emissions factor from 0.171 to 0.180 kg CO₂/km using weighted average from EPA, DEFRA, and EEA data for more accurate real-world estimates.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">ℹ️ Information Tooltips</h3>
              <p>Hover over the info icon (ℹ️) next to "CO₂ Emissions" to see detailed calculation methodology, sources, and factors considered.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">📊 Authoritative Sources</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>US EPA (2023): Average passenger vehicle emissions</li>
                <li>UK DEFRA (2023): Government greenhouse gas conversion factors</li>
                <li>EU EEA (2023): European Environment Agency transport data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
