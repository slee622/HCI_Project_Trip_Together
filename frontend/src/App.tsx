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
import { getMyStartupState, StartupState } from './services/startupState';

type AppView = 'create-trip' | 'planner';

interface PlannerTripDetails {
  origin: string;
  dateRange: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
}

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loadingStartup, setLoadingStartup] = useState(false);
  const [view, setView] = useState<AppView>('create-trip');
  const [startupState, setStartupState] = useState<StartupState | null>(null);
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
          setLoadingStartup(false);
          setView('create-trip');
        }
        return;
      }

      setLoadingStartup(true);

      try {
        const data = await getMyStartupState();
        if (mounted) {
          setStartupState(data);
        }
      } catch (error) {
        console.warn('Failed to load startup state:', error);
        if (mounted) {
          setStartupState(null);
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
    setPlannerTripDetails({
      origin: trip.origin,
      dateRange: trip.dateRange,
      departureDate: trip.departureDate,
      returnDate: trip.returnDate,
      travelers: trip.travelers,
    });
    setView('planner');
  }, []);

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
        onTripCreated={handleTripCreated}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <TripPlannerScreen
      onSignOut={handleSignOut}
      onBack={() => setView('create-trip')}
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
