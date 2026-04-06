/**
 * TripPlannerScreen Component
 * Main screen with sidebar layout matching the mockup design
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
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
import { CompareScreen } from './CompareScreen';
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

// ============================================
// STAGE TYPES & STEPPER COMPONENT
// ============================================

export type TripStage = 'preferences' | 'compare' | 'voted';

const STAGE_CONFIG: { key: TripStage; label: string; number: number }[] = [
  { key: 'preferences', label: 'Preferences', number: 1 },
  { key: 'compare', label: 'Compare', number: 2 },
  { key: 'voted', label: 'Voted', number: 3 },
];

interface StageStepperProps {
  stage: TripStage;
  compareCount: number;
  onNavigate: (stage: TripStage) => void;
}

const StageStepper: React.FC<StageStepperProps> = ({ stage, compareCount, onNavigate }) => {
  const currentIndex = STAGE_CONFIG.findIndex((s) => s.key === stage);

  return (
    <View style={stepperStyles.container}>
      {STAGE_CONFIG.map((s, index) => {
        const isActive = s.key === stage;
        const isCompleted = index < currentIndex;
        const canNavigate =
          (s.key === 'preferences' && stage !== 'voted') ||
          (s.key === 'compare' && compareCount >= 2) ||
          (s.key === 'voted' && stage === 'voted');

        return (
          <React.Fragment key={s.key}>
            {index > 0 && (
              <View style={[stepperStyles.line, isCompleted && stepperStyles.lineCompleted]} />
            )}
            <TouchableOpacity
              style={stepperStyles.stepWrapper}
              onPress={() => { if (canNavigate) onNavigate(s.key); }}
              disabled={!canNavigate}
            >
              <View style={[
                stepperStyles.stepCircle,
                isActive && stepperStyles.stepCircleActive,
                isCompleted && stepperStyles.stepCircleCompleted,
                !canNavigate && !isActive && !isCompleted && stepperStyles.stepCircleLocked,
              ]}>
                <Text style={[
                  stepperStyles.stepNumber,
                  (isActive || isCompleted) && stepperStyles.stepNumberLight,
                ]}>
                  {isCompleted ? '✓' : String(s.number)}
                </Text>
              </View>
              <Text style={[
                stepperStyles.stepLabel,
                isActive && stepperStyles.stepLabelActive,
                isCompleted && stepperStyles.stepLabelCompleted,
                !canNavigate && !isActive && !isCompleted && stepperStyles.stepLabelLocked,
              ]}>
                {s.label}
                {s.key === 'voted' && stage !== 'voted' ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    gap: 0,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    maxWidth: 80,
    marginHorizontal: 4,
  },
  lineCompleted: {
    backgroundColor: '#F5A623',
  },
  stepWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepCircleLocked: {
    backgroundColor: '#F0F0F0',
    borderColor: '#CBD5E1',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  stepNumberLight: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepLabelActive: {
    color: '#F5A623',
    fontWeight: '800',
  },
  stepLabelCompleted: {
    color: '#4CAF50',
  },
  stepLabelLocked: {
    color: '#CBD5E1',
  },
});

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

  // Stage navigation
  const [stage, setStage] = useState<TripStage>('preferences');
  const [votedDestinationIds, setVotedDestinationIds] = useState<string[]>([]);

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
    if (compareList.length >= 2) {
      setStage('compare');
    }
  }, [compareList]);

  // Handle vote from compare screen
  const handleVote = useCallback((destinationIds: string[]) => {
    console.log('Voted for destinations:', destinationIds);
    // TODO: Save votes to backend
    setVotedDestinationIds(destinationIds);
    setStage('voted');
  }, []);

  // Handle stage navigation from stepper
  const handleStageNavigate = useCallback((target: TripStage) => {
    if (stage === 'voted') return; // fully locked
    if (target === 'compare' && compareList.length < 2) return;
    setStage(target);
  }, [stage, compareList.length]);

  // Check if destination is in compare list
  const isInCompareList = useCallback(
    (id: string) => compareList.some((d) => d.id === id),
    [compareList]
  );

  const isLocked = stage === 'voted';

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

      {/* Stage Stepper */}
      <StageStepper
        stage={stage}
        compareCount={compareList.length}
        onNavigate={handleStageNavigate}
      />

      {/* Main Content — Preferences & Map */}
      {stage === 'preferences' && (
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
                disabled={loading}
              />
              <ComparePanel
                destinations={compareList}
                onCompare={handleCompare}
                onRemoveDestination={handleRemoveFromCompare}
                locked={false}
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
      )}

      {/* Compare & Voted stages */}
      {(stage === 'compare' || stage === 'voted') && (
        <CompareScreen
          destinations={compareList}
          tripDetails={{
            origin: activeTrip.origin,
            departureDate: activeTrip.departureDate,
            returnDate: activeTrip.returnDate,
            travelers: activeTrip.travelers,
          }}
          currentUserId={currentUserId}
          onBack={() => setStage('preferences')}
          onVote={handleVote}
          locked={isLocked}
          votedDestinationIds={votedDestinationIds}
        />
      )}
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
