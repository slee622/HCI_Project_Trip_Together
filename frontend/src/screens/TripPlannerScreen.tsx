/**
 * TripPlannerScreen Component
 * Main screen with sidebar layout matching the mockup design
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Alert, View, StyleSheet, ScrollView } from 'react-native';
import {
  UserPreferences,
  CompareDestination,
  RecommendationWithEstimate,
  DEFAULT_PREFERENCES,
  SLIDER_CONFIGS,
  SliderDimension,
  userPrefsToGroupPrefs,
} from '../types';
import { getRecommendationsWithEstimates } from '../services/api';
import { Header } from '../components/Header';
import { PreferencesPanel } from '../components/PreferencesPanel';
import { ComparePanel } from '../components/ComparePanel';
import { TripMapView } from '../components/TripMapView';
import { SliderMemberMarker } from '../components/MultiUserSlider';
import { CompareScreen } from './CompareScreen';
import {
  listTripCompareDestinations,
  StartupCompareOption,
  StartupGroupMember,
  StartupPreference,
  StartupRecommendation,
  StartupState,
  StartupVote,
} from '../services/startupState';
import {
  removeTripVote,
  removeCompareDestination,
  saveCompareDestination,
  saveSelectedDestination,
  saveTripPreferences,
  saveTripRecommendations,
  saveTripVote,
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
const MEMBER_COLOR_PALETTE = ['#4A90D9', '#5C6AC4', '#2D9CDB', '#27AE60', '#E67E22', '#EB5757'];

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

function mapGroupMembersToCompareUsers(
  members: StartupGroupMember[]
): Array<{ id: string; initial: string; color: string; preferences?: Record<string, number> }> {
  return members.map((member, index) => ({
    id: member.userId,
    initial: (member.displayName || member.handle || 'U').trim().charAt(0).toUpperCase(),
    color: MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length],
  }));
}

function buildPreferenceMarkerByDimension(
  members: StartupGroupMember[],
  preferences: StartupPreference[],
  currentUserId?: string
): Record<SliderDimension, SliderMemberMarker[]> {
  const markersByDimension: Record<SliderDimension, SliderMemberMarker[]> = {
    adventure: [],
    budget: [],
    setting: [],
    weather: [],
    focus: [],
  };

  const preferenceByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));

  members.forEach((member, index) => {
    if (currentUserId && member.userId === currentUserId) {
      return;
    }

    const savedPreferences = preferenceByUserId.get(member.userId);
    if (!savedPreferences) {
      return;
    }

    const markerBase = {
      userId: member.userId,
      initial: (member.displayName || member.handle || 'U').trim().charAt(0).toUpperCase(),
      color: MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length],
      label: member.displayName || member.handle || 'User',
    };

    SLIDER_CONFIGS.forEach(({ key }) => {
      markersByDimension[key].push({
        ...markerBase,
        value: clampPreference(savedPreferences[key]),
      });
    });
  });

  return markersByDimension;
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

  // Show compare screen
  const [showCompareScreen, setShowCompareScreen] = useState(false);

  // Recommendations from API
  const [recommendations, setRecommendations] = useState<RecommendationWithEstimate[]>(() =>
    mapStartupRecommendations(startupState?.recommendations)
  );
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(
    startupState?.selectedOption?.destinationId || null
  );
  const [votes, setVotes] = useState<StartupVote[]>(startupState?.votes || []);
  const compareUsers = useMemo(
    () => mapGroupMembersToCompareUsers(startupState?.groupMembers || []),
    [startupState?.groupMembers]
  );
  const memberPreferenceMarkers = useMemo(
    () =>
      buildPreferenceMarkerByDimension(
        startupState?.groupMembers || [],
        startupState?.preferences || [],
        currentUserId
      ),
    [startupState?.groupMembers, startupState?.preferences, currentUserId]
  );

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
    if (compareList.length >= 2) {
      setShowCompareScreen(true);
    }
  }, [compareList]);

  // Handle vote from compare screen
  const handleVote = useCallback(async (destinationId: string, removeVote = false) => {
    console.log('Voted for destination:', destinationId);

    if (!tripSessionId || !currentUserId) {
      console.warn('Missing trip session or user id, skipping vote persistence');
      return;
    }

    try {
      if (removeVote) {
        await removeTripVote(tripSessionId, destinationId);
        setVotes((prev) =>
          prev.filter(
            (vote) => !(vote.destinationId === destinationId && vote.userId === currentUserId)
          )
        );
        return;
      }

      await saveTripVote(tripSessionId, destinationId, 1);
      setVotes((prev) => {
        const nowIso = new Date().toISOString();
        const existingIndex = prev.findIndex(
          (vote) => vote.destinationId === destinationId && vote.userId === currentUserId
        );

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            vote: 1,
            updatedAt: nowIso,
          };
          return next;
        }

        return [
          ...prev,
          {
            destinationId,
            userId: currentUserId,
            vote: 1,
            updatedAt: nowIso,
          },
        ];
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save vote';
      console.warn('Failed to persist vote:', error);
      Alert.alert('Vote failed', message);
    }
  }, [tripSessionId, currentUserId]);

  // Check if destination is in compare list
  const isInCompareList = useCallback(
    (id: string) => compareList.some((d) => d.id === id),
    [compareList]
  );

  // Show compare screen if active
  if (showCompareScreen) {
    return (
      <CompareScreen
        destinations={compareList}
        tripDetails={{
          origin: activeTrip.origin,
          departureDate: activeTrip.departureDate,
          returnDate: activeTrip.returnDate,
          travelers: activeTrip.travelers,
        }}
        users={compareUsers}
        voteMembers={startupState?.groupMembers || []}
        votes={votes}
        currentUserId={currentUserId}
        onBack={() => setShowCompareScreen(false)}
        onVote={handleVote}
      />
    );
  }

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
          <ScrollView
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator
          >
            <PreferencesPanel
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
              memberPreferenceMarkers={memberPreferenceMarkers}
              disabled={loading}
            />
            <ComparePanel
              destinations={compareList}
              onCompare={handleCompare}
              onRemoveDestination={handleRemoveFromCompare}
            />
          </ScrollView>
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
    width: 350,
    backgroundColor: '#FAFBFC',
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  sidebarContent: {
    width: 300,
    paddingBottom: 16,
  },
  mapContainer: {
    flex: 1,
  },
});

export default TripPlannerScreen;
