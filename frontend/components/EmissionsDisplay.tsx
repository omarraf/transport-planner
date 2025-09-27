"use client"

import { useState, useEffect } from 'react'
import { Info, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { emissionsService, type EmissionsMethodology } from '@/lib/emissions-service'

interface EmissionsDisplayProps {
  emissions: number // kg CO2
  mode: string // transport mode ID
  className?: string
}

export function EmissionsDisplay({ emissions, mode, className = "" }: EmissionsDisplayProps) {
  const [methodology, setMethodology] = useState<EmissionsMethodology | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMethodology = async () => {
      setLoading(true)
      try {
        const data = await emissionsService.getMethodology(mode)
        setMethodology(data || emissionsService.getFallbackMethodology(mode))
      } catch (error) {
        console.error('Error fetching methodology:', error)
        setMethodology(emissionsService.getFallbackMethodology(mode))
      } finally {
        setLoading(false)
      }
    }

    fetchMethodology()
  }, [mode])

  const formatEmissions = (value: number): string => {
    if (value === 0) return '0'
    if (value < 0.001) return '<0.001'
    return value.toFixed(3)
  }

  const renderMethodologyTooltip = () => {
    if (!methodology) {
      return (
        <div className="max-w-sm">
          <div className="font-medium mb-1">Loading methodology...</div>
        </div>
      )
    }

    return (
      <div className="max-w-md space-y-3">
        <div>
          <div className="font-medium text-sm mb-1">Calculation Method</div>
          <div className="text-xs text-gray-600">{methodology.methodology}</div>
        </div>
        
        {methodology.sources.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1">Sources</div>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {methodology.sources.map((source, index) => (
                <li key={index}>• {source}</li>
              ))}
            </ul>
          </div>
        )}
        
        {methodology.factors.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1">Key Factors</div>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {methodology.factors.map((factor, index) => (
                <li key={index}>• {factor}</li>
              ))}
            </ul>
          </div>
        )}

        {methodology.note && (
          <div>
            <div className="font-medium text-sm mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Note
            </div>
            <div className="text-xs text-gray-600">{methodology.note}</div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Emission factor: {methodology.emissionsFactor} kg CO₂/km
        </div>
      </div>
    )
  }

  return (
    <div className={`p-3 bg-green-50 rounded-lg border border-green-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-green-800 flex items-center gap-1">
          🌱 CO₂ Emissions
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="inline-flex items-center justify-center rounded-full w-4 h-4 bg-green-200 hover:bg-green-300 transition-colors"
                  aria-label="View emissions calculation methodology"
                >
                  <Info className="h-2.5 w-2.5 text-green-700" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="bg-white border border-gray-200 shadow-lg"
                sideOffset={8}
              >
                {renderMethodologyTooltip()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="text-sm font-bold text-green-700">
        {formatEmissions(emissions)} kg
      </div>
    </div>
  )
}