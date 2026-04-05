/**
 * TripPlannerScreen Component
 * Main screen with sidebar layout matching the mockup design
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  UserPreferences,
  CompareDestination,
  RecommendationWithEstimate,
  DEFAULT_PREFERENCES,
  SliderDimension,
  userPrefsToGroupPrefs,
} from '../types';
import { getRecommendationsWithEstimates } from '../services/api';
import { Header } from '../components/Header';
import { PreferencesPanel } from '../components/PreferencesPanel';
import { ComparePanel } from '../components/ComparePanel';
import { TripMapView } from '../components/TripMapView';

// Trip details configuration
const DEFAULT_TRIP = {
  origin: 'PHL',
  dateRange: 'March 6 - March 8',
  departureDate: '2026-03-06',
  returnDate: '2026-03-08',
  travelers: 1,
};

// Debounce delay for fetching recommendations after preference changes (ms)
const DEBOUNCE_DELAY = 300;

interface TripPlannerScreenProps {
  onSignOut?: () => void;
  onBack?: () => void;
  tripDetails?: {
    origin: string;
    dateRange: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
  };
}

export const TripPlannerScreen: React.FC<TripPlannerScreenProps> = ({
  onSignOut,
  onBack,
  tripDetails,
}) => {
  const activeTrip = useMemo(() => tripDetails || DEFAULT_TRIP, [tripDetails]);

  // User preferences (5 sliders)
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Compare destinations
  const [compareList, setCompareList] = useState<CompareDestination[]>([]);

  // Recommendations from API
  const [recommendations, setRecommendations] = useState<RecommendationWithEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async (prefs: UserPreferences) => {
    setLoading(true);
    try {
      const groupPrefs = userPrefsToGroupPrefs(prefs);
      console.log('User preferences:', prefs);
      console.log('Mapped to group preferences:', groupPrefs);
      const results = await getRecommendationsWithEstimates(
        groupPrefs,
        {
          origin: activeTrip.origin,
          travelers: activeTrip.travelers,
          departureDate: activeTrip.departureDate,
          returnDate: activeTrip.returnDate,
        },
        10
      );
      setRecommendations(results);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTrip]);

  // Load recommendations on mount
  useEffect(() => {
    fetchRecommendations(preferences);
  }, [fetchRecommendations, preferences]);

  // Handle preference change from sliders
  const handlePreferenceChange = useCallback((
    dimension: SliderDimension,
    value: number
  ) => {
    const newPrefs = {
      ...preferences,
      [dimension]: value,
    };
    setPreferences(newPrefs);

    // Debounce the recommendation fetch
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchRecommendations(newPrefs);
    }, DEBOUNCE_DELAY);
  }, [preferences, fetchRecommendations]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Add destination to compare list
  const handleAddToCompare = useCallback((dest: RecommendationWithEstimate) => {
    const compareDestination: CompareDestination = {
      id: dest.id,
      city: dest.city,
      state: dest.state,
      category: dest.reason.split('.')[0] || 'Destination',
      priceRange: dest.estimate
        ? `$${dest.estimate.low}-${dest.estimate.high}/person`
        : 'Price TBD',
    };

    setCompareList((prev) => {
      if (prev.some((d) => d.id === dest.id)) return prev;
      return [...prev, compareDestination];
    });
  }, []);

  // Remove destination from compare list
  const handleRemoveFromCompare = useCallback((id: string) => {
    setCompareList((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Handle compare button click
  const handleCompare = useCallback(() => {
    console.log('Comparing destinations:', compareList);
  }, [compareList]);

  // Check if destination is in compare list
  const isInCompareList = useCallback(
    (id: string) => compareList.some((d) => d.id === id),
    [compareList]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        origin={activeTrip.origin}
        dateRange={activeTrip.dateRange}
        users={[]}
        onBack={onBack || (() => console.log('Back pressed'))}
        onDone={onSignOut || (() => console.log('Done pressed'))}
        doneLabel={onSignOut ? 'SIGN OUT' : 'DONE'}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <PreferencesPanel
            preferences={preferences}
            onPreferenceChange={handlePreferenceChange}
            disabled={loading}
          />
          <ComparePanel
            destinations={compareList}
            onCompare={handleCompare}
            onRemoveDestination={handleRemoveFromCompare}
          />
        </View>

        {/* Map Area */}
        <View style={styles.mapContainer}>
          <TripMapView
            recommendations={recommendations}
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={setSelectedDestinationId}
            onAddToCompare={handleAddToCompare}
            isInCompareList={isInCompareList}
            loading={loading}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FAFBFC',
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  mapContainer: {
    flex: 1,
  },
});

export default TripPlannerScreen;
