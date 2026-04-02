/**
 * MapScreen Component
 * Displays recommended destinations on an interactive U.S. map
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { RecommendationWithEstimate } from '../types';
import { DestinationMarker } from '../components/DestinationMarker';
import { DestinationCard } from '../components/DestinationCard';

interface MapScreenProps {
  recommendations: RecommendationWithEstimate[];
  selectedDestinationId?: string;
  onSelectDestination?: (id: string | null) => void;
  loading?: boolean;
}

// Initial region centered on continental US
const US_CENTER_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 35,
  longitudeDelta: 50,
};

export const MapScreen: React.FC<MapScreenProps> = ({
  recommendations,
  selectedDestinationId,
  onSelectDestination,
  loading = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const [selectedDestination, setSelectedDestination] = useState<RecommendationWithEstimate | null>(null);

  // Update selected destination when prop changes
  useEffect(() => {
    if (selectedDestinationId) {
      const dest = recommendations.find((r) => r.id === selectedDestinationId);
      if (dest) {
        setSelectedDestination(dest);
        // Animate to selected destination
        mapRef.current?.animateToRegion({
          latitude: dest.latitude,
          longitude: dest.longitude,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }, 500);
      }
    } else {
      setSelectedDestination(null);
    }
  }, [selectedDestinationId, recommendations]);

  const handleMarkerPress = (destination: RecommendationWithEstimate) => {
    setSelectedDestination(destination);
    onSelectDestination?.(destination.id);

    // Animate to marker
    mapRef.current?.animateToRegion({
      latitude: destination.latitude,
      longitude: destination.longitude,
      latitudeDelta: 5,
      longitudeDelta: 5,
    }, 300);
  };

  const handleMapPress = () => {
    setSelectedDestination(null);
    onSelectDestination?.(null);
  };

  const handleCloseCard = () => {
    setSelectedDestination(null);
    onSelectDestination?.(null);
    
    // Zoom back out to US view
    mapRef.current?.animateToRegion(US_CENTER_REGION, 300);
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={US_CENTER_REGION}
        onPress={handleMapPress}
        mapType="standard"
        showsUserLocation={false}
        showsPointsOfInterest={false}
      >
        {recommendations.map((destination, index) => (
          <Marker
            key={destination.id}
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            onPress={() => handleMarkerPress(destination)}
            tracksViewChanges={false}
          >
            <DestinationMarker
              rank={index + 1}
              score={destination.score}
              isSelected={selectedDestination?.id === destination.id}
            />
          </Marker>
        ))}
      </MapView>

      {selectedDestination && (
        <View style={styles.cardContainer}>
          <DestinationCard
            destination={selectedDestination}
            onClose={handleCloseCard}
          />
        </View>
      )}

      {/* Legend */}
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

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
    maxHeight: height * 0.45,
  },
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
