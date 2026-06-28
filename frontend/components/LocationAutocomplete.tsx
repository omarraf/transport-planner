"use client";

import React, { useRef } from 'react';
import { SearchBox } from '@mapbox/search-js-react';
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';
import type { Location } from "@/lib/api";

interface SearchBoxProperties {
  name?: string;
  place_formatted?: string;
  mapbox_id?: string;
  context?: {
    country?: { name?: string; country_code?: string };
    region?: { name?: string; region_code?: string };
  };
}

interface LocationAutocompleteProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: Location | null) => void;
  selectedLocation: Location | null;
  className?: string;
}

export default function LocationAutocomplete({
  placeholder,
  value,
  onChange,
  onLocationSelect,
  selectedLocation,
  className = ""
}: LocationAutocompleteProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  const justRetrievedRef = useRef(false);

  const handleRetrieve = (res: SearchBoxRetrieveResponse) => {
    const feature = res.features[0];
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const props = feature.properties as SearchBoxProperties;
    const ctx = props.context ?? {};

    const context: Location['context'] = [];
    if (ctx.country) {
      context.push({
        id: `country.${props.mapbox_id}`,
        text: ctx.country.name ?? '',
        short_code: ctx.country.country_code,
      });
    }
    if (ctx.region) {
      context.push({
        id: `region.${props.mapbox_id}`,
        text: ctx.region.name ?? '',
        short_code: ctx.region.region_code,
      });
    }

    justRetrievedRef.current = true;
    onLocationSelect({
      lat,
      lng,
      name: props.place_formatted ?? props.name ?? '',
      place_id: props.mapbox_id,
      context: context.length > 0 ? context : undefined,
    });
  };

  const handleChange = (val: string) => {
    onChange(val);
    if (justRetrievedRef.current) {
      justRetrievedRef.current = false;
      return;
    }
    if (selectedLocation) {
      onLocationSelect(null);
    }
  };

  return (
    <div className={className}>
      <SearchBox
        accessToken={accessToken}
        value={value}
        onChange={handleChange}
        onRetrieve={handleRetrieve}
        onClear={() => onLocationSelect(null)}
        placeholder={placeholder}
        options={{ language: 'en' }}
        theme={{
          variables: {
            fontFamily: 'inherit',
            unit: '14px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid hsl(var(--border))',
            colorBackground: 'hsl(var(--background))',
            colorText: 'hsl(var(--foreground))',
            colorPrimary: 'hsl(var(--primary))',
          },
        }}
      />
    </div>
  );
}
