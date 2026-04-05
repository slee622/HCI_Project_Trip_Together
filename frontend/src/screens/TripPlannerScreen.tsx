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
import {
  listTripCompareDestinations,
  StartupCompareOption,
  StartupRecommendation,
  StartupState,
  StartupVote,
} from '../services/startupState';
import {
  removeCompareDestination,
  saveCompareDestination,
  saveSelectedDestination,
  saveTripPreferences,
  saveTripRecommendations,
} from '../services/tripStatePersistence';

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
  tripSessionId?: string;
  startupState?: StartupState | null;
  currentUserId?: string;
  tripDetails?: {
    origin: string;
    dateRange: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
  };
}

function clampPreference(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function resolvePreferencesFromStartup(
  startupState: StartupState | null | undefined,
  currentUserId?: string
): UserPreferences {
  const prefs = startupState?.preferences || [];
  if (prefs.length === 0) {
    return DEFAULT_PREFERENCES;
  }

  const mine = currentUserId ? prefs.find((item) => item.userId === currentUserId) : null;
  const selected = mine || prefs[0];

  return {
    adventure: clampPreference(selected.adventure),
    budget: clampPreference(selected.budget),
    setting: clampPreference(selected.setting),
    weather: clampPreference(selected.weather),
    focus: clampPreference(selected.focus),
  };
}

function mapStartupRecommendations(
  recommendations: StartupRecommendation[] | undefined
): RecommendationWithEstimate[] {
  if (!recommendations || recommendations.length === 0) {
    return [];
  }

  return recommendations.map((item) => ({
    id: item.destination.id,
    city: item.destination.city,
    state: item.destination.state,
    latitude: item.destination.latitude,
    longitude: item.destination.longitude,
    score: item.score,
    reason: item.reason,
  }));
}

function mapCompareOptionsToCompareDestinations(
  options: StartupCompareOption[]
): CompareDestination[] {
  return options.map((option) => {
    const description = option.destination.shortDescription || 'Saved destination';
    const category = description.split('.')[0].trim() || 'Saved destination';
    return {
      id: option.destinationId,
      city: option.destination.city,
      state: option.destination.state,
      category,
      priceRange: 'Price TBD',
    };
  });
}

export const TripPlannerScreen: React.FC<TripPlannerScreenProps> = ({
  onSignOut,
  onBack,
  tripSessionId,
  startupState,
  currentUserId,
  tripDetails,
}) => {
  const activeTrip = useMemo(() => tripDetails || DEFAULT_TRIP, [tripDetails]);
  const skipNextAutoFetchRef = useRef(Boolean((startupState?.recommendations || []).length));

  // User preferences (5 sliders)
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    resolvePreferencesFromStartup(startupState, currentUserId)
  );

  // Compare destinations
  const [compareList, setCompareList] = useState<CompareDestination[]>([]);

  // Recommendations from API
  const [recommendations, setRecommendations] = useState<RecommendationWithEstimate[]>(() =>
    mapStartupRecommendations(startupState?.recommendations)
  );
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(
    startupState?.selectedOption?.destinationId || null
  );
  const [votes, setVotes] = useState<StartupVote[]>(startupState?.votes || []);

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
      if (tripSessionId) {
        saveTripRecommendations(tripSessionId, results).catch((persistError) => {
          console.warn('Failed to persist recommendations:', persistError);
        });
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTrip]);

  // Load recommendations on mount / preference change.
  useEffect(() => {
    if (skipNextAutoFetchRef.current) {
      skipNextAutoFetchRef.current = false;
      return;
    }
    fetchRecommendations(preferences);
  }, [fetchRecommendations, preferences]);

  // Hydrate planner from startup payload when opening a trip.
  useEffect(() => {
    if (!startupState?.tripSession) {
      return;
    }

    setPreferences(resolvePreferencesFromStartup(startupState, currentUserId));
    setRecommendations(mapStartupRecommendations(startupState.recommendations));
    setSelectedDestinationId(startupState.selectedOption?.destinationId || null);
    setVotes(startupState.votes || []);

    if ((startupState.recommendations || []).length > 0) {
      skipNextAutoFetchRef.current = true;
    }
  }, [startupState, currentUserId]);

  useEffect(() => {
    if (!tripSessionId || !selectedDestinationId) return;
    saveSelectedDestination(tripSessionId, selectedDestinationId).catch((error) => {
      console.warn('Failed to persist selected destination:', error);
    });
  }, [tripSessionId, selectedDestinationId]);

  useEffect(() => {
    if (!tripSessionId) return;
    listTripCompareDestinations(tripSessionId)
      .then((items) => {
        setCompareList(mapCompareOptionsToCompareDestinations(items));
      })
      .catch((error) => {
        console.warn('Failed to load compare destinations:', error);
      });
  }, [tripSessionId]);

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
      if (tripSessionId) {
        saveTripPreferences(tripSessionId, newPrefs).catch((persistError) => {
          console.warn('Failed to persist preferences:', persistError);
        });
      }
      fetchRecommendations(newPrefs);
    }, DEBOUNCE_DELAY);
  }, [preferences, fetchRecommendations, tripSessionId]);

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
    if (tripSessionId) {
      saveCompareDestination(tripSessionId, dest.id).catch((error) => {
        console.warn('Failed to persist compare destination:', error);
      });
    }
  }, [tripSessionId]);

  // Remove destination from compare list
  const handleRemoveFromCompare = useCallback((id: string) => {
    setCompareList((prev) => prev.filter((d) => d.id !== id));
    if (tripSessionId) {
      removeCompareDestination(tripSessionId, id).catch((error) => {
        console.warn('Failed to remove compare destination:', error);
      });
    }
  }, [tripSessionId]);

  // Handle compare button click
  const handleCompare = useCallback(() => {
    console.log('Comparing destinations:', compareList, 'Loaded votes:', votes);
  }, [compareList, votes]);

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
