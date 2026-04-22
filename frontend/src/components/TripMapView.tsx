/**
 * TripMapView Component
 * Interactive map with destination markers and popup cards
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native';
import { CustomMapMarker, RecommendationWithEstimate } from '../types';

// Leaflet imports (web only)
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let useMap: any;
let useMapEvents: any;
let L: any;

if (Platform.OS === 'web') {
  const leaflet = require('leaflet');
  const reactLeaflet = require('react-leaflet');
  MapContainer = reactLeaflet.MapContainer;
  TileLayer = reactLeaflet.TileLayer;
  Marker = reactLeaflet.Marker;
  Popup = reactLeaflet.Popup;
  useMap = reactLeaflet.useMap;
  useMapEvents = reactLeaflet.useMapEvents;
  L = leaflet;

  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface TripMapViewProps {
  recommendations: RecommendationWithEstimate[];
  customMarkers?: CustomMapMarker[];
  selectedDestinationId?: string | null;
  onSelectDestination?: (id: string | null) => void;
  onAddToCompare?: (dest: RecommendationWithEstimate) => void;
  onAddCustomToCompare?: (marker: CustomMapMarker) => void;
  onAddCustomMarker?: (latitude: number, longitude: number) => void;
  onMoveCustomMarker?: (id: string, latitude: number, longitude: number) => void;
  onDeleteCustomMarker?: (id: string) => void;
  isInCompareList?: (id: string) => boolean;
  loading?: boolean;
}

// Multi-colored pin marker
const createPinIcon = (
  colors: string[] = ['#4CAF50', '#FF9800', '#9C27B0'],
  isSelected: boolean = false
) => {
  if (!L) return null;

  const colorSegments = colors
    .map((color, i) => {
      const angle = (360 / colors.length) * i;
      const nextAngle = (360 / colors.length) * (i + 1);
      return `${color} ${angle}deg ${nextAngle}deg`;
    })
    .join(', ');

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        position: relative;
      ">
        <div style="
          width: 24px;
          height: 24px;
          background: conic-gradient(${colorSegments});
          border-radius: 50%;
          border: ${isSelected ? '3px solid #2563EB' : '2px solid white'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: absolute;
          top: 0;
          left: 4px;
        "></div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid white;
          position: absolute;
          bottom: 0;
          left: 10px;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Component to fit map bounds
const FitBounds: React.FC<{ points: Array<{ latitude: number; longitude: number }> }> = ({
  points,
}) => {
  const map = useMap();
  const initialFitDone = React.useRef(false);

  useEffect(() => {
    // Only fit bounds on initial load, not on every recommendation change
    if (points.length > 0 && !initialFitDone.current) {
      initialFitDone.current = true;
      // Delay to ensure map is fully initialized
      setTimeout(() => {
        try {
          const bounds = points.map(
            (r) => [r.latitude, r.longitude] as [number, number]
          );
          map.fitBounds(bounds, { padding: [50, 50], animate: false });
        } catch (e) {
          console.warn('Failed to fit bounds:', e);
        }
      }, 100);
    }
  }, [points, map]);

  return null;
};

const AddCustomMarkerOnDoubleClick: React.FC<{
  onAddCustomMarker?: (latitude: number, longitude: number) => void;
}> = ({ onAddCustomMarker }) => {
  useMapEvents({
    dblclick: (event: any) => {
      onAddCustomMarker?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

// Map popup content component
const MapPopupContent: React.FC<{
  dest: RecommendationWithEstimate;
  isInCompare: boolean;
  onToggleCompare: () => void;
}> = ({ dest, isInCompare, onToggleCompare }) => {
  const category = dest.reason.split('.')[0] || 'Destination';
  const priceRange = dest.estimate
    ? `$${dest.estimate.low}-${dest.estimate.high}/person`
    : 'Price TBD';

  const dragData = JSON.stringify({
    id: dest.id,
    city: dest.city,
    state: dest.state,
    latitude: dest.latitude,
    longitude: dest.longitude,
    category,
    priceRange,
  });

  return React.createElement('div', {
    draggable: true,
    onDragStart: (e: any) => { e.dataTransfer.setData('application/json', dragData); },
    style: { minWidth: 180, padding: 4, cursor: 'grab' },
  }, [
    React.createElement('div', { key: 'title', style: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 } },
      `${dest.city}, ${dest.state}`
    ),
    React.createElement('div', { key: 'category', style: { fontSize: 13, color: '#F5A623', fontWeight: 500, marginBottom: 4 } },
      category
    ),
    React.createElement(
      'div',
      {
        key: 'description',
        style: { fontSize: 12, color: '#4B5563', lineHeight: '16px', marginBottom: 6 },
      },
      dest.reason
    ),
    React.createElement('div', { key: 'price', style: { fontSize: 13, color: '#666', marginBottom: 12 } }, 
      priceRange
    ),
    React.createElement('div', {
      key: 'hint',
      style: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
        fontStyle: 'italic',
      },
    }, 'Drag the pin to adjust this destination'),
    React.createElement('label', { 
      key: 'compare', 
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8, 
        cursor: 'pointer',
        fontSize: 13,
        color: '#333'
      } 
    }, [
      React.createElement('input', {
        key: 'checkbox',
        type: 'checkbox',
        checked: isInCompare,
        onChange: onToggleCompare,
        style: { width: 16, height: 16, accentColor: '#F5A623' }
      }),
      'Add to Compare'
    ])
  ]);
};

const CustomMapPopupContent: React.FC<{
  marker: CustomMapMarker;
  isInCompare: boolean;
  onToggleCompare: () => void;
  onDelete: () => void;
}> = ({ marker, isInCompare, onToggleCompare, onDelete }) => {
  const category = 'Custom location';
  const priceRange = 'Price TBD';
  const description = 'Added custom location marker for your group trip.';

  const dragData = JSON.stringify({
    id: marker.id,
    city: marker.city,
    state: marker.state,
    latitude: marker.latitude,
    longitude: marker.longitude,
    category,
    priceRange,
  });

  return React.createElement('div', {
    draggable: true,
    onDragStart: (e: any) => { e.dataTransfer.setData('application/json', dragData); },
    style: { minWidth: 180, padding: 4, cursor: 'grab' },
  }, [
    React.createElement(
      'div',
      { key: 'title', style: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 } },
      `${marker.city}${marker.state ? `, ${marker.state}` : ''}`
    ),
    React.createElement('div', { key: 'category', style: { fontSize: 13, color: '#0EA5E9', fontWeight: 500, marginBottom: 4 } },
      category
    ),
    React.createElement(
      'div',
      {
        key: 'description',
        style: { fontSize: 12, color: '#4B5563', lineHeight: '16px', marginBottom: 6 },
      },
      description
    ),
    React.createElement('div', { key: 'price', style: { fontSize: 13, color: '#666', marginBottom: 12 } },
      priceRange
    ),
    React.createElement('div', {
      key: 'hint',
      style: {
        fontSize: 12,
        color: '#0EA5E9',
        marginBottom: 12,
        fontWeight: 600,
      },
    }, 'Drag the pin to adjust this destination'),
    React.createElement('label', {
      key: 'compare',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontSize: 13,
        color: '#333',
      },
    }, [
      React.createElement('input', {
        key: 'checkbox',
        type: 'checkbox',
        checked: isInCompare,
        onChange: onToggleCompare,
        style: { width: 16, height: 16, accentColor: '#F5A623' },
      }),
      'Add to Compare',
    ]),
    React.createElement(
      'button',
      {
        key: 'delete',
        type: 'button',
        onClick: onDelete,
        style: {
          marginTop: 10,
          width: '100%',
          backgroundColor: '#EF4444',
          border: 'none',
          borderRadius: 6,
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 700,
          padding: '7px 8px',
          cursor: 'pointer',
        },
      },
      'Delete Custom Marker'
    ),
  ]);
};

export const TripMapView: React.FC<TripMapViewProps> = ({
  recommendations,
  customMarkers = [],
  selectedDestinationId,
  onSelectDestination,
  onAddToCompare,
  onAddCustomToCompare,
  onAddCustomMarker,
  onMoveCustomMarker,
  onDeleteCustomMarker,
  isInCompareList = () => false,
  loading = false,
}) => {
  const [cssLoaded, setCssLoaded] = useState(false);
  const mapPoints = [...recommendations, ...customMarkers];

  // Load Leaflet CSS and custom styles
  useEffect(() => {
    if (Platform.OS === 'web' && !cssLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);

      // Add custom styles for gray map
      const style = document.createElement('style');
      style.textContent = `
        .leaflet-tile {
          filter: grayscale(100%) brightness(1.1);
        }
        .custom-pin-marker {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);

      setCssLoaded(true);
    }
  }, [cssLoaded]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Loading destinations...</Text>
      </View>
    );
  }

  if (recommendations.length === 0 && customMarkers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No destinations found. Adjust your preferences to see results.
        </Text>
      </View>
    );
  }

  // U.S. center coordinates
  const usCenter: [number, number] = [39.8283, -98.5795];

  if (Platform.OS !== 'web' || !MapContainer) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Map not available on this platform</Text>
      </View>
    );
  }

  const pinIcon = createPinIcon();
  const selectedPinIcon = createPinIcon(['#2563EB', '#60A5FA', '#BFDBFE'], true);
  const customPinIcon = createPinIcon(['#0EA5E9', '#22C55E', '#14B8A6']);
  return (
    <View style={styles.container}>
      {onAddCustomMarker ? (
        <View style={styles.addMarkerHint}>
          <Text style={styles.addMarkerHintText}>Double-click map to add a custom marker</Text>
        </View>
      ) : null}
      <MapContainer
        center={usCenter}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={mapPoints} />
        <AddCustomMarkerOnDoubleClick onAddCustomMarker={onAddCustomMarker} />

        {recommendations.map((dest) => (
          <Marker
            key={dest.id}
            position={[dest.latitude, dest.longitude]}
            icon={dest.id === selectedDestinationId ? selectedPinIcon : pinIcon}
            draggable={false}
            eventHandlers={{
              click: () => onSelectDestination?.(dest.id),
            }}
          >
            <Popup>
              <MapPopupContent
                dest={dest}
                isInCompare={isInCompareList(dest.id)}
                onToggleCompare={() => onAddToCompare?.(dest)}
              />
            </Popup>
          </Marker>
        ))}

        {customMarkers.map((marker) => (
          <Marker
            key={`custom-${marker.id}`}
            position={[marker.latitude, marker.longitude]}
            icon={customPinIcon}
            draggable={true}
            eventHandlers={{
              dragend: (event: any) => {
                const updated = event.target.getLatLng();
                onMoveCustomMarker?.(marker.id, updated.lat, updated.lng);
              },
            }}
          >
            <Popup>
              <CustomMapPopupContent
                marker={marker}
                isInCompare={isInCompareList(marker.id)}
                onToggleCompare={() => onAddCustomToCompare?.(marker)}
                onDelete={() => onDeleteCustomMarker?.(marker.id)}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  addMarkerHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E4EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addMarkerHintText: {
    fontSize: 12,
    color: '#0F4C81',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default TripMapView;
