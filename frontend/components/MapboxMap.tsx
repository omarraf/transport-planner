"use client";

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Set your Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface Location {
  lat: number;
  lng: number;
  name: string;
  place_id?: string;
}

export interface RouteResult {
  distance: number;
  duration: number;
  coordinates: [number, number][];
  geometry?: string;
}

interface MapboxMapProps {
  startLocation: Location | null;
  endLocation: Location | null;
  route: RouteResult | null;
  selectedMode: string;
  onMapClick?: (lngLat: [number, number]) => void;
  className?: string;
}

const transportModeColors = {
  walking: '#22c55e',
  cycling: '#3b82f6', 
  driving: '#ef4444',
  transit: '#8b5cf6'
};

export default function MapboxMap({
  startLocation,
  endLocation,
  route,
  selectedMode,
  onMapClick,
  className = "w-full h-full"
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Markers refs
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const endMarker = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-0.1276, 51.5074], // London
      zoom: 10,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add attribution
    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }), 'bottom-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Handle map clicks
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onMapClick]);

  // Update start location marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing start marker
    if (startMarker.current) {
      startMarker.current.remove();
      startMarker.current = null;
    }

    if (startLocation) {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'start-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#22c55e';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      startMarker.current = new mapboxgl.Marker(el)
        .setLngLat([startLocation.lng, startLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div style="font-weight: 600; color: #22c55e;">📍 Start</div><div>${startLocation.name}</div>`)
        )
        .addTo(map.current);
    }
  }, [startLocation, mapLoaded]);

  // Update end location marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing end marker
    if (endMarker.current) {
      endMarker.current.remove();
      endMarker.current = null;
    }

    if (endLocation) {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'end-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#ef4444';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      endMarker.current = new mapboxgl.Marker(el)
        .setLngLat([endLocation.lng, endLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div style="font-weight: 600; color: #ef4444;">🎯 End</div><div>${endLocation.name}</div>`)
        )
        .addTo(map.current);
    }
  }, [endLocation, mapLoaded]);

  // Update route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing route layer
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    if (route && route.coordinates && route.coordinates.length > 0) {
      const routeColor = transportModeColors[selectedMode as keyof typeof transportModeColors] || '#3b82f6';
      
      // Add route source
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates
          }
        }
      });

      // Add route layer
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': routeColor,
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }
  }, [route, selectedMode, mapLoaded]);

  // Fit map to show both locations and route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const coordinates: [number, number][] = [];
    
    if (startLocation) {
      coordinates.push([startLocation.lng, startLocation.lat]);
    }
    
    if (endLocation) {
      coordinates.push([endLocation.lng, endLocation.lat]);
    }

    if (route && route.coordinates) {
      coordinates.push(...route.coordinates);
    }

    if (coordinates.length > 0) {
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [startLocation, endLocation, route, mapLoaded]);

  // Map control functions
  const zoomIn = () => {
    if (map.current) {
      map.current.zoomIn();
    }
  };

  const zoomOut = () => {
    if (map.current) {
      map.current.zoomOut();
    }
  };

  const resetView = () => {
    if (map.current) {
      map.current.flyTo({
        center: [-0.1276, 51.5074], // London
        zoom: 10,
        essential: true
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
      
      {/* Custom map controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button size="sm" variant="secondary" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={resetView}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs shadow-md">
        <div className="font-medium mb-2">Map Legend</div>
        <div className="space-y-1">
          {startLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Start Location</span>
            </div>
          )}
          {endLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>End Location</span>
            </div>
          )}
          {route && (
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-1 rounded" 
                style={{ backgroundColor: transportModeColors[selectedMode as keyof typeof transportModeColors] || '#3b82f6' }}
              ></div>
              <span>Route ({selectedMode})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}