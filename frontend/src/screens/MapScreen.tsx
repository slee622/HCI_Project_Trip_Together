/**
 * MapScreen Component
 * Displays recommended destinations on an interactive U.S. map using Leaflet
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { RecommendationWithEstimate } from '../types';
import { DestinationCard } from '../components/DestinationCard';

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

interface MapScreenProps {
  recommendations: RecommendationWithEstimate[];
  selectedDestinationId?: string;
  onSelectDestination?: (id: string | null) => void;
  loading?: boolean;
}

// Custom marker icon based on score
const createCustomIcon = (score: number, rank: number) => {
  if (!L) return null;
  
  const color = score >= 80 ? '#4CAF50' : score >= 60 ? '#8BC34A' : '#FFC107';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${rank}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Component to fit map bounds
const FitBounds: React.FC<{ recommendations: RecommendationWithEstimate[] }> = ({ recommendations }) => {
  const map = useMap();
  
  useEffect(() => {
    if (recommendations.length > 0) {
      const bounds = recommendations.map(r => [r.latitude, r.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [recommendations, map]);
  
  return null;
};

export const MapScreen: React.FC<MapScreenProps> = ({
  recommendations,
  selectedDestinationId,
  onSelectDestination,
  loading = false,
}) => {
  const [selectedDestination, setSelectedDestination] = useState<RecommendationWithEstimate | null>(
    selectedDestinationId 
      ? recommendations.find(r => r.id === selectedDestinationId) || null 
      : null
  );
  const [cssLoaded, setCssLoaded] = useState(false);

  // Load Leaflet CSS
  useEffect(() => {
    if (Platform.OS === 'web' && !cssLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
      setCssLoaded(true);
    }
  }, [cssLoaded]);

  const handleSelect = (dest: RecommendationWithEstimate) => {
    setSelectedDestination(dest);
    onSelectDestination?.(dest.id);
  };

  const handleClose = () => {
    setSelectedDestination(null);
    onSelectDestination?.(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No recommendations yet. Set your preferences to get started!
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

  return (
    <View style={styles.container}>
      <MapContainer
        center={usCenter}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds recommendations={recommendations} />
        
        {recommendations.map((dest, index) => (
          <Marker
            key={dest.id}
            position={[dest.latitude, dest.longitude]}
            icon={createCustomIcon(dest.score, index + 1)}
            eventHandlers={{
              click: () => handleSelect(dest),
            }}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                <strong style={{ fontSize: 14 }}>{dest.city}, {dest.state}</strong>
                <div style={{ color: '#4A90D9', fontWeight: 'bold', marginTop: 4 }}>
                  Score: {dest.score}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {dest.reason}
                </div>
                {dest.estimate && (
                  <div style={{ fontSize: 12, color: '#333', marginTop: 8 }}>
                    Est. Cost: ${dest.estimate.low.toLocaleString()} - ${dest.estimate.high.toLocaleString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {selectedDestination && (
        <View style={styles.cardContainer}>
          <DestinationCard
            destination={selectedDestination}
            onClose={handleClose}
          />
        </View>
      )}

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Match Score</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendLabel}>80+</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8BC34A' }]} />
            <Text style={styles.legendLabel}>60-79</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendLabel}>40-59</Text>
          </View>
        </View>
      </View>
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
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#F5F5F5',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: '#666',
  },
});

export default MapScreen;
