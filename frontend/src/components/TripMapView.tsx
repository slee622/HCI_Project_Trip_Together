/**
 * TripMapView Component
 * Interactive map with destination markers and popup cards
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { RecommendationWithEstimate } from '../types';

// Leaflet imports (web only)
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let useMap: any;
let L: any;

if (Platform.OS === 'web') {
  const leaflet = require('leaflet');
  const reactLeaflet = require('react-leaflet');
  MapContainer = reactLeaflet.MapContainer;
  TileLayer = reactLeaflet.TileLayer;
  Marker = reactLeaflet.Marker;
  Popup = reactLeaflet.Popup;
  useMap = reactLeaflet.useMap;
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
  selectedDestinationId?: string | null;
  onSelectDestination?: (id: string | null) => void;
  onAddToCompare?: (dest: RecommendationWithEstimate) => void;
  onMoveDestination?: (id: string, latitude: number, longitude: number) => void;
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
const FitBounds: React.FC<{ recommendations: RecommendationWithEstimate[] }> = ({
  recommendations,
}) => {
  const map = useMap();
  const initialFitDone = React.useRef(false);

  useEffect(() => {
    // Only fit bounds on initial load, not on every recommendation change
    if (recommendations.length > 0 && !initialFitDone.current) {
      initialFitDone.current = true;
      // Delay to ensure map is fully initialized
      setTimeout(() => {
        try {
          const bounds = recommendations.map(
            (r) => [r.latitude, r.longitude] as [number, number]
          );
          map.fitBounds(bounds, { padding: [50, 50], animate: false });
        } catch (e) {
          console.warn('Failed to fit bounds:', e);
        }
      }, 100);
    }
  }, [recommendations, map]);

  return null;
};

// Map popup content component
const MapPopupContent: React.FC<{
  dest: RecommendationWithEstimate;
  isInCompare: boolean;
  onToggleCompare: () => void;
  isEditable?: boolean;
}> = ({ dest, isInCompare, onToggleCompare }) => {
  const category = dest.reason.split('.')[0] || 'Destination';
  const priceRange = dest.estimate
    ? `$${dest.estimate.low}-${dest.estimate.high}/person`
    : 'Price TBD';

  const dragData = JSON.stringify({
    id: dest.id,
    city: dest.city,
    state: dest.state,
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
    }, 'Drag this card to add to compare panel'),
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

export const TripMapView: React.FC<TripMapViewProps> = ({
  recommendations,
  selectedDestinationId,
  onSelectDestination,
  onAddToCompare,
  onMoveDestination,
  isInCompareList = () => false,
  loading = false,
}) => {
  const [cssLoaded, setCssLoaded] = useState(false);

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

  if (recommendations.length === 0) {
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

  return (
    <View style={styles.container}>
      <MapContainer
        center={usCenter}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds recommendations={recommendations} />

        {recommendations.map((dest) => (
          <Marker
            key={dest.id}
            position={[dest.latitude, dest.longitude]}
            icon={dest.id === selectedDestinationId ? selectedPinIcon : pinIcon}
            draggable={true}
            eventHandlers={{
              click: () => onSelectDestination?.(dest.id),
              dragend: (event: any) => {
                const marker = event.target;
                const position = marker.getLatLng();
                onMoveDestination?.(dest.id, position.lat, position.lng);
              },
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
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
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
