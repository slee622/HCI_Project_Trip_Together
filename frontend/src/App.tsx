/**
 * Trip Together App
 * Main application component with authentication gate
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { TripPlannerScreen } from './screens/TripPlannerScreen';
import { LoginScreen } from './screens/LoginScreen';
import { CreateTripScreen, CreatedTripDetails } from './screens/CreateTripScreen';
import {
  AuthSession,
  clearStoredSession,
  getAuthConfigError,
  getStoredSession,
  signOut,
} from './services/auth';
import {
  acceptGroupInvite,
  getTripStartupState,
  getMyStartupState,
  listMyPendingGroupInvites,
  listMyTripSessions,
  MyTripSummary,
  PendingGroupInvite,
  rejectGroupInvite,
  StartupState,
} from './services/startupState';

type AppView = 'create-trip' | 'planner';

interface PlannerTripDetails {
  tripSessionId: string;
  origin: string;
  dateRange: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
}

function formatDateRange(departureDate: string, returnDate: string): string {
  if (!departureDate || !returnDate) return 'Select dates';

  const start = new Date(`${departureDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${departureDate} - ${returnDate}`;

  const startMonth = start.toLocaleDateString(undefined, { month: 'long' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  return startMonth === endMonth
    ? `${startMonth} ${startDay} - ${endDay}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loadingStartup, setLoadingStartup] = useState(false);
  const [view, setView] = useState<AppView>('create-trip');
  const [startupState, setStartupState] = useState<StartupState | null>(null);
  const [currentTrips, setCurrentTrips] = useState<MyTripSummary[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingGroupInvite[]>([]);
  const [plannerTripDetails, setPlannerTripDetails] = useState<PlannerTripDetails | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const storedSession = await getStoredSession();
        if (mounted) {
          setSession(storedSession);
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthenticated = useCallback((newSession: AuthSession) => {
    setSession(newSession);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadStartup = async () => {
      if (!session) {
        if (mounted) {
          setStartupState(null);
          setCurrentTrips([]);
          setPendingInvites([]);
          setLoadingStartup(false);
          setView('create-trip');
        }
        return;
      }

      setLoadingStartup(true);

      try {
        const [data, trips, invites] = await Promise.all([
          getMyStartupState().catch((error) => {
            console.warn('Failed to load startup state:', error);
            return null;
          }),
          listMyTripSessions().catch((error) => {
            console.warn('Failed to load current trips:', error);
            return [];
          }),
          listMyPendingGroupInvites().catch((error) => {
            console.warn('Failed to load pending invites:', error);
            return [];
          }),
        ]);
        if (mounted) {
          setStartupState(data);
          setCurrentTrips(trips);
          setPendingInvites(invites);
        }
      } finally {
        if (mounted) {
          setLoadingStartup(false);
          setView('create-trip');
        }
      }
    };

    loadStartup();

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleTripCreated = useCallback((trip: CreatedTripDetails) => {
    setCurrentTrips((prev) => [
      {
        id: trip.tripSessionId,
        groupId: trip.groupId,
        groupName: trip.groupName,
        title: trip.title,
        origin: trip.origin,
        departureDate: trip.departureDate,
        returnDate: trip.returnDate,
        travelers: trip.travelers,
        status: 'active',
        updatedAt: new Date().toISOString(),
      },
      ...prev.filter((item) => item.id !== trip.tripSessionId),
    ]);
    setPlannerTripDetails({
      tripSessionId: trip.tripSessionId,
      origin: trip.origin,
      dateRange: trip.dateRange,
      departureDate: trip.departureDate,
      returnDate: trip.returnDate,
      travelers: trip.travelers,
    });
    setView('planner');
  }, []);

  const handleOpenCurrentTrip = useCallback(async (tripSessionId: string) => {
    const fallbackTrip = currentTrips.find((trip) => trip.id === tripSessionId);

    if (fallbackTrip) {
      setPlannerTripDetails({
        tripSessionId: fallbackTrip.id,
        origin: fallbackTrip.origin,
        dateRange: formatDateRange(fallbackTrip.departureDate, fallbackTrip.returnDate),
        departureDate: fallbackTrip.departureDate,
        returnDate: fallbackTrip.returnDate,
        travelers: fallbackTrip.travelers,
      });
      setView('planner');
    }

    try {
      const data = await getTripStartupState(tripSessionId);
      const trip = data.tripSession;
      if (!trip) {
        if (!fallbackTrip) {
          throw new Error('Trip session not found.');
        }
        return;
      }

      setStartupState(data);
      setPlannerTripDetails({
        tripSessionId: tripSessionId,
        origin: trip.origin,
        dateRange: formatDateRange(trip.departureDate, trip.returnDate),
        departureDate: trip.departureDate,
        returnDate: trip.returnDate,
        travelers: trip.travelers,
      });
      if (!fallbackTrip) {
        setView('planner');
      }
    } catch (error) {
      if (fallbackTrip) {
        console.warn('Opened trip with fallback data due startup RPC failure:', error);
        return;
      }
      throw error;
    }
  }, [currentTrips]);

  const refreshCreateTripData = useCallback(async () => {
    const [data, trips, invites] = await Promise.all([
      getMyStartupState().catch((error) => {
        console.warn('Failed to refresh startup state:', error);
        return null;
      }),
      listMyTripSessions().catch((error) => {
        console.warn('Failed to refresh current trips:', error);
        return [];
      }),
      listMyPendingGroupInvites().catch((error) => {
        console.warn('Failed to refresh pending invites:', error);
        return [];
      }),
    ]);
    setStartupState(data);
    setCurrentTrips(trips);
    setPendingInvites(invites);
  }, []);

  const handleAcceptInvite = useCallback(async (inviteCode: string) => {
    await acceptGroupInvite(inviteCode);
    await refreshCreateTripData();
  }, [refreshCreateTripData]);

  const handleRejectInvite = useCallback(async (inviteCode: string) => {
    await rejectGroupInvite(inviteCode);
    await refreshCreateTripData();
  }, [refreshCreateTripData]);

  const handleSignOut = useCallback(async () => {
    if (!session) return;

    try {
      await signOut(session.accessToken);
    } catch (error) {
      console.warn('Sign-out request failed:', error);
    } finally {
      await clearStoredSession();
      setSession(null);
      setPlannerTripDetails(null);
      setStartupState(null);
      setCurrentTrips([]);
      setPendingInvites([]);
      setView('create-trip');
    }
  }, [session]);

  const authConfigError = getAuthConfigError();

  if (authConfigError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Auth Configuration Missing</Text>
        <Text style={styles.message}>
          Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your frontend env.
        </Text>
      </View>
    );
  }

  if (bootstrapping) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.message}>Loading session...</Text>
      </View>
    );
  }

  if (loadingStartup) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F5A623" />
        <Text style={styles.message}>Loading trip data...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  if (view === 'create-trip') {
    return (
      <CreateTripScreen
        startupState={startupState}
        pendingInvites={pendingInvites}
        currentTrips={currentTrips}
        onAcceptInvite={handleAcceptInvite}
        onRejectInvite={handleRejectInvite}
        onOpenTrip={handleOpenCurrentTrip}
        onTripCreated={handleTripCreated}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <TripPlannerScreen
      onSignOut={handleSignOut}
      onBack={() => setView('create-trip')}
      tripSessionId={plannerTripDetails?.tripSessionId || startupState?.tripSession?.id}
      startupState={startupState}
      currentUserId={session.user.id}
      tripDetails={plannerTripDetails || undefined}
    />
  );
};

export default App;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F5F8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#5F6B7A',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 420,
  },
});
