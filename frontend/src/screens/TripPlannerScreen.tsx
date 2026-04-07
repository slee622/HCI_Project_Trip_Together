/**
 * TripPlannerScreen Component
 * Main screen with sidebar layout matching the mockup design
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Alert, View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
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
import { getRealtimeClient, removeRealtimeChannel } from '../services/realtime';

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
const MEMBER_COLOR_PALETTE = ['#4A90D9', '#5C6AC4', '#2D9CDB', '#27AE60', '#E67E22', '#EB5757'];

interface TripPreferenceRealtimeRow {
  user_id: string;
  adventure: number;
  budget: number;
  setting: number;
  weather: number;
  focus: number;
  updated_at: string;
}

interface TripVoteRealtimeRow {
  destination_id: string;
  user_id: string;
  vote: -1 | 1;
  updated_at: string;
}

interface TripPreferenceBroadcastPayload {
  userId: string;
  adventure: number;
  budget: number;
  setting: number;
  weather: number;
  focus: number;
  updatedAt: string;
}

interface TripVoteBroadcastPayload {
  destinationId: string;
  userId: string;
  vote?: -1 | 1;
  updatedAt?: string;
}

interface TripCompareBroadcastPayload {
  destination?: CompareDestination;
  destinationId?: string;
}

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
  const scopedStartupState = useMemo(() => {
    if (!startupState?.tripSession) {
      return null;
    }
    if (tripSessionId && startupState.tripSession.id !== tripSessionId) {
      return null;
    }
    return startupState;
  }, [startupState, tripSessionId]);

  const activeTrip = useMemo(() => tripDetails || DEFAULT_TRIP, [tripDetails]);
  const skipNextAutoFetchRef = useRef(Boolean((scopedStartupState?.recommendations || []).length));

  // User preferences (5 sliders)
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    resolvePreferencesFromStartup(scopedStartupState, currentUserId)
  );

  // Compare destinations
  const [compareList, setCompareList] = useState<CompareDestination[]>([]);

  // Stage navigation
  const [stage, setStage] = useState<TripStage>('preferences');
  const [votedDestinationIds, setVotedDestinationIds] = useState<string[]>([]);

  // Recommendations from API
  const [recommendations, setRecommendations] = useState<RecommendationWithEstimate[]>(() =>
    mapStartupRecommendations(scopedStartupState?.recommendations)
  );
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(
    scopedStartupState?.selectedOption?.destinationId || null
  );
  const [livePreferences, setLivePreferences] = useState<StartupPreference[]>(
    scopedStartupState?.preferences || []
  );
  const [votes, setVotes] = useState<StartupVote[]>(scopedStartupState?.votes || []);
  const compareUsers = useMemo(
    () => mapGroupMembersToCompareUsers(scopedStartupState?.groupMembers || []),
    [scopedStartupState?.groupMembers]
  );
  const memberPreferenceMarkers = useMemo(
    () =>
      buildPreferenceMarkerByDimension(
        scopedStartupState?.groupMembers || [],
        livePreferences,
        currentUserId
      ),
    [scopedStartupState?.groupMembers, livePreferences, currentUserId]
  );
  const tripRealtimeChannelRef = useRef<RealtimeChannel | null>(null);

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
  }, [activeTrip, tripSessionId]);

  // Load recommendations on mount / preference change.
  useEffect(() => {
    if (skipNextAutoFetchRef.current) {
      skipNextAutoFetchRef.current = false;
      return;
    }
    fetchRecommendations(preferences);
  }, [fetchRecommendations, preferences]);

  // Hydrate planner only when startup payload matches the active trip.
  useEffect(() => {
    if (!tripSessionId) {
      return;
    }

    if (!scopedStartupState?.tripSession) {
      setPreferences(DEFAULT_PREFERENCES);
      setRecommendations([]);
      setSelectedDestinationId(null);
      setLivePreferences([]);
      setVotes([]);
      skipNextAutoFetchRef.current = false;
      return;
    }

    setPreferences(resolvePreferencesFromStartup(scopedStartupState, currentUserId));
    setRecommendations(mapStartupRecommendations(scopedStartupState.recommendations));
    setSelectedDestinationId(scopedStartupState.selectedOption?.destinationId || null);
    setLivePreferences(scopedStartupState.preferences || []);
    setVotes(scopedStartupState.votes || []);

    skipNextAutoFetchRef.current = (scopedStartupState.recommendations || []).length > 0;
  }, [tripSessionId, scopedStartupState, currentUserId]);

  useEffect(() => {
    if (!tripSessionId || !selectedDestinationId) return;
    saveSelectedDestination(tripSessionId, selectedDestinationId).catch((error) => {
      console.warn('Failed to persist selected destination:', error);
    });
  }, [tripSessionId, selectedDestinationId]);

  useEffect(() => {
    if (!tripSessionId) {
      setCompareList([]);
      return;
    }
    listTripCompareDestinations(tripSessionId)
      .then((items) => {
        setCompareList(mapCompareOptionsToCompareDestinations(items));
      })
      .catch((error) => {
        console.warn('Failed to load compare destinations:', error);
      });
  }, [tripSessionId]);

  const loadCompareDestinations = useCallback(() => {
    if (!tripSessionId) return;
    return listTripCompareDestinations(tripSessionId)
      .then((items) => {
        setCompareList(mapCompareOptionsToCompareDestinations(items));
      })
      .catch((error) => {
        console.warn('Failed to load compare destinations:', error);
      });
  }, [tripSessionId]);

  const upsertLivePreference = useCallback((row: TripPreferenceRealtimeRow): void => {
    const mapped: StartupPreference = {
      userId: row.user_id,
      adventure: clampPreference(row.adventure),
      budget: clampPreference(row.budget),
      setting: clampPreference(row.setting),
      weather: clampPreference(row.weather),
      focus: clampPreference(row.focus),
      updatedAt: row.updated_at,
    };

    setLivePreferences((prev) => {
      const index = prev.findIndex((item) => item.userId === mapped.userId);
      if (index < 0) {
        return [...prev, mapped];
      }
      const next = [...prev];
      next[index] = mapped;
      return next;
    });
  }, []);

  const applyRealtimeVote = useCallback((
    row: TripVoteRealtimeRow,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  ): void => {
    if (eventType === 'DELETE') {
      setVotes((prev) =>
        prev.filter(
          (vote) => !(vote.destinationId === row.destination_id && vote.userId === row.user_id)
        )
      );
      return;
    }

    const mapped: StartupVote = {
      destinationId: row.destination_id,
      userId: row.user_id,
      vote: row.vote,
      updatedAt: row.updated_at,
    };

    setVotes((prev) => {
      const index = prev.findIndex(
        (vote) => vote.destinationId === mapped.destinationId && vote.userId === mapped.userId
      );
      if (index < 0) {
        return [...prev, mapped];
      }
      const next = [...prev];
      next[index] = mapped;
      return next;
    });
  }, []);

  const broadcastTripEvent = useCallback(async (
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> => {
    const channel = tripRealtimeChannelRef.current;
    if (!channel) return;

    try {
      const result = await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      if (result !== 'ok') {
        console.warn(`Broadcast send failed (${event}):`, result);
      }
    } catch (error) {
      console.warn(`Broadcast send error (${event}):`, error);
    }
  }, []);

  useEffect(() => {
    if (!tripSessionId) return;

    let active = true;
    let channel: RealtimeChannel | null = null;

    const subscribe = async () => {
      try {
        const realtimeClient = await getRealtimeClient();
        if (!active) return;

        channel = realtimeClient
          .channel(`trip-sync:${tripSessionId}`, {
            config: {
              broadcast: { self: false },
            },
          })
          .on(
            'broadcast',
            { event: 'trip_preference_changed' },
            ({ payload }) => {
              if (!active) return;
              const data = payload as TripPreferenceBroadcastPayload;
              if (!data?.userId) return;

              upsertLivePreference({
                user_id: data.userId,
                adventure: data.adventure,
                budget: data.budget,
                setting: data.setting,
                weather: data.weather,
                focus: data.focus,
                updated_at: data.updatedAt,
              });
            }
          )
          .on(
            'broadcast',
            { event: 'trip_compare_added' },
            ({ payload }) => {
              if (!active) return;
              const data = payload as TripCompareBroadcastPayload;
              if (!data.destination?.id) return;
              setCompareList((prev) => {
                if (prev.some((item) => item.id === data.destination!.id)) {
                  return prev;
                }
                return [...prev, data.destination!];
              });
            }
          )
          .on(
            'broadcast',
            { event: 'trip_compare_removed' },
            ({ payload }) => {
              if (!active) return;
              const data = payload as TripCompareBroadcastPayload;
              if (!data.destinationId) return;
              setCompareList((prev) => prev.filter((item) => item.id !== data.destinationId));
            }
          )
          .on(
            'broadcast',
            { event: 'trip_vote_changed' },
            ({ payload }) => {
              if (!active) return;
              const data = payload as TripVoteBroadcastPayload;
              if (!data.destinationId || !data.userId || !data.vote) return;
              applyRealtimeVote(
                {
                  destination_id: data.destinationId,
                  user_id: data.userId,
                  vote: data.vote,
                  updated_at: data.updatedAt || new Date().toISOString(),
                },
                'UPDATE'
              );
            }
          )
          .on(
            'broadcast',
            { event: 'trip_vote_removed' },
            ({ payload }) => {
              if (!active) return;
              const data = payload as TripVoteBroadcastPayload;
              if (!data.destinationId || !data.userId) return;
              applyRealtimeVote(
                {
                  destination_id: data.destinationId,
                  user_id: data.userId,
                  vote: 1,
                  updated_at: data.updatedAt || new Date().toISOString(),
                },
                'DELETE'
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_user_preferences',
              filter: `trip_session_id=eq.${tripSessionId}`,
            },
            (payload) => {
              if (!active) return;
              const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
              const row = (
                eventType === 'DELETE' ? payload.old : payload.new
              ) as TripPreferenceRealtimeRow | null;
              if (!row) return;

              if (eventType === 'DELETE') {
                setLivePreferences((prev) => prev.filter((item) => item.userId !== row.user_id));
                return;
              }
              upsertLivePreference(row);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_destination_votes',
              filter: `trip_session_id=eq.${tripSessionId}`,
            },
            (payload) => {
              if (!active) return;
              const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
              const row = (
                eventType === 'DELETE' ? payload.old : payload.new
              ) as TripVoteRealtimeRow | null;
              if (!row) return;
              applyRealtimeVote(row, eventType);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'trip_compare_destinations',
              filter: `trip_session_id=eq.${tripSessionId}`,
            },
            () => {
              if (!active) return;
              void loadCompareDestinations();
            }
          );

        tripRealtimeChannelRef.current = channel;
        channel.subscribe((status) => {
          console.log('Trip realtime status:', status, tripSessionId);
          if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime channel error for trip sync:', tripSessionId);
          }
          if (status === 'TIMED_OUT') {
            console.warn('Realtime trip channel timed out:', tripSessionId);
          }
        });
      } catch (error) {
        console.warn('Failed to connect realtime trip sync:', error);
      }
    };

    void subscribe();

    return () => {
      active = false;
      if (tripRealtimeChannelRef.current === channel) {
        tripRealtimeChannelRef.current = null;
      }
      if (channel) {
        removeRealtimeChannel(channel);
      }
    };
  }, [tripSessionId, loadCompareDestinations, upsertLivePreference, applyRealtimeVote]);

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
        saveTripPreferences(tripSessionId, newPrefs)
          .then(() =>
            broadcastTripEvent('trip_preference_changed', {
              userId: currentUserId,
              ...newPrefs,
              updatedAt: new Date().toISOString(),
            })
          )
          .catch((persistError) => {
            console.warn('Failed to persist preferences:', persistError);
          });
      }
      fetchRecommendations(newPrefs);
    }, DEBOUNCE_DELAY);
  }, [preferences, fetchRecommendations, tripSessionId, currentUserId, broadcastTripEvent]);

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
      saveCompareDestination(tripSessionId, dest.id)
        .then(() =>
          broadcastTripEvent('trip_compare_added', {
            destination: compareDestination,
          })
        )
        .catch((error) => {
          console.warn('Failed to persist compare destination:', error);
        });
    }
  }, [tripSessionId, broadcastTripEvent]);

  // Remove destination from compare list
  const handleRemoveFromCompare = useCallback((id: string) => {
    setCompareList((prev) => prev.filter((d) => d.id !== id));
    if (tripSessionId) {
      removeCompareDestination(tripSessionId, id)
        .then(() =>
          broadcastTripEvent('trip_compare_removed', {
            destinationId: id,
          })
        )
        .catch((error) => {
          console.warn('Failed to remove compare destination:', error);
        });
    }
  }, [tripSessionId, broadcastTripEvent]);

  // Handle destination dropped onto compare panel (already a CompareDestination)
  const handleDropToCompare = useCallback((dest: CompareDestination) => {
    setCompareList((prev) => {
      if (prev.some((d) => d.id === dest.id)) return prev;
      return [...prev, dest];
    });
    if (tripSessionId) {
      saveCompareDestination(tripSessionId, dest.id)
        .then(() => broadcastTripEvent('trip_compare_added', { destination: dest }))
        .catch((error) => console.warn('Failed to persist compare destination:', error));
    }
  }, [tripSessionId, broadcastTripEvent]);

  // Handle compare button click
  const handleCompare = useCallback(() => {
    if (compareList.length >= 2) {
      setStage('compare');
    }
  }, [compareList]);

  // Handle stage navigation from stepper
  const handleStageNavigate = useCallback((target: TripStage) => {
    if (stage === 'voted') return; // fully locked
    if (target === 'compare' && compareList.length < 2) return;
    setStage(target);
  }, [stage, compareList.length]);


  // Handle vote from compare screen
  const handleVote = useCallback(async (destinationId: string, removeVote = false) => {
    console.log('Voted for destination:', destinationId);

    if (!tripSessionId || !currentUserId) {
      console.warn('Missing trip session or user id, skipping vote persistence');
      if (!removeVote) {
        setVotedDestinationIds((prev) => [...prev.filter((id) => id !== destinationId), destinationId]);
        setStage('voted');
      } else {
        setVotedDestinationIds((prev) => prev.filter((id) => id !== destinationId));
      }
      return;
    }

    try {
      if (removeVote) {
        await removeTripVote(tripSessionId, destinationId);
        await broadcastTripEvent('trip_vote_removed', {
          destinationId,
          userId: currentUserId,
          updatedAt: new Date().toISOString(),
        });
        setVotes((prev) =>
          prev.filter(
            (vote) => !(vote.destinationId === destinationId && vote.userId === currentUserId)
          )
        );
        setVotedDestinationIds((prev) => prev.filter((id) => id !== destinationId));
        return;
      }

      await saveTripVote(tripSessionId, destinationId, 1);
      const nowIso = new Date().toISOString();
      await broadcastTripEvent('trip_vote_changed', {
        destinationId,
        userId: currentUserId,
        vote: 1,
        updatedAt: nowIso,
      });
      setVotes((prev) => {
        const existingIndex = prev.findIndex(
          (vote) => vote.destinationId === destinationId && vote.userId === currentUserId
        );
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], vote: 1, updatedAt: nowIso };
          return next;
        }
        return [...prev, { destinationId, userId: currentUserId, vote: 1, updatedAt: nowIso }];
      });
      setVotedDestinationIds((prev) => [...prev.filter((id) => id !== destinationId), destinationId]);
      setStage('voted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save vote';
      console.warn('Failed to persist vote:', error);
      Alert.alert('Vote failed', message);
    }
  }, [tripSessionId, currentUserId, broadcastTripEvent]);

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

      {/* Preferences & Map stage */}
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
                memberPreferenceMarkers={memberPreferenceMarkers}
                disabled={loading}
              />
              <ComparePanel
                destinations={compareList}
                onCompare={handleCompare}
                onRemoveDestination={handleRemoveFromCompare}
                onDropDestination={handleDropToCompare}
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
          users={compareUsers}
          voteMembers={scopedStartupState?.groupMembers || []}
          votes={votes}
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
