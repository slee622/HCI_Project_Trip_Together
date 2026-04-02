/**
 * Trip Together App
 * Main application component with navigation and state management
 */

import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  GroupPreferences,
  DEFAULT_PREFERENCES,
  RecommendationWithEstimate,
} from './types';
import { getRecommendationsWithEstimates } from './services/api';
import { PreferenceSliders } from './components/PreferenceSliders';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { MapScreen } from './screens/MapScreen';

type Tab = 'preferences' | 'list' | 'map';

// TODO: These will come from team's trip planning flow
const DEFAULT_TRIP_DETAILS = {
  origin: 'PHL',
  travelers: 4,
  departureDate: '2026-04-20',
  returnDate: '2026-04-25',
};

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('preferences');
  const [preferences, setPreferences] = useState<GroupPreferences>(DEFAULT_PREFERENCES);
  const [recommendations, setRecommendations] = useState<RecommendationWithEstimate[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Trip details (will come from team's components)
  const [tripDetails, setTripDetails] = useState(DEFAULT_TRIP_DETAILS);

  // Fetch recommendations
  const handleGetRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const results = await getRecommendationsWithEstimates(
        preferences,
        tripDetails,
        10
      );
      setRecommendations(results);
      setActiveTab('list');
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      Alert.alert(
        'Error',
        'Failed to get recommendations. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [preferences, tripDetails]);

  // Handle destination selection (syncs between list and map)
  const handleSelectDestination = useCallback((id: string | null) => {
    setSelectedDestinationId(id);
    if (id && activeTab === 'list') {
      setActiveTab('map');
    }
  }, [activeTab]);

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'preferences':
        return (
          <ScrollView style={styles.tabContent}>
            <PreferenceSliders
              preferences={preferences}
              onPreferencesChange={setPreferences}
              disabled={loading}
            />
            
            {/* Trip Details Section */}
            <View style={styles.tripDetailsSection}>
              <Text style={styles.sectionTitle}>Trip Details</Text>
              <Text style={styles.sectionSubtitle}>
                {/* TODO: Team will integrate this with their trip planning flow */}
              </Text>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Origin Airport</Text>
                <TextInput
                  style={styles.input}
                  value={tripDetails.origin}
                  onChangeText={(text) =>
                    setTripDetails({ ...tripDetails, origin: text.toUpperCase() })
                  }
                  maxLength={3}
                  autoCapitalize="characters"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Travelers</Text>
                <TextInput
                  style={styles.input}
                  value={String(tripDetails.travelers)}
                  onChangeText={(text) =>
                    setTripDetails({ ...tripDetails, travelers: parseInt(text) || 1 })
                  }
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Departure</Text>
                <TextInput
                  style={styles.input}
                  value={tripDetails.departureDate}
                  onChangeText={(text) =>
                    setTripDetails({ ...tripDetails, departureDate: text })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Return</Text>
                <TextInput
                  style={styles.input}
                  value={tripDetails.returnDate}
                  onChangeText={(text) =>
                    setTripDetails({ ...tripDetails, returnDate: text })
                  }
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.getRecsButton, loading && styles.buttonDisabled]}
              onPress={handleGetRecommendations}
              disabled={loading}
            >
              <Text style={styles.getRecsButtonText}>
                {loading ? 'Finding Destinations...' : 'Get Recommendations'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        );
        
      case 'list':
        return (
          <RecommendationsScreen
            recommendations={recommendations}
            selectedDestinationId={selectedDestinationId ?? undefined}
            onSelectDestination={handleSelectDestination}
            loading={loading}
            onRefresh={handleGetRecommendations}
          />
        );
        
      case 'map':
        return (
          <MapScreen
            recommendations={recommendations}
            selectedDestinationId={selectedDestinationId ?? undefined}
            onSelectDestination={handleSelectDestination}
            loading={loading}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Together</Text>
        <Text style={styles.headerSubtitle}>Find your perfect destination</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preferences' && styles.tabActive]}
          onPress={() => setActiveTab('preferences')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'preferences' && styles.tabTextActive,
            ]}
          >
            Preferences
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text
            style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}
          >
            List
          </Text>
          {recommendations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recommendations.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text
            style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4A90D9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#4A90D9',
  },
  badge: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tripDetailsSection: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  getRecsButton: {
    backgroundColor: '#4A90D9',
    margin: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A0C4E8',
  },
  getRecsButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default App;
