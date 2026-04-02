/**
 * RecommendationsScreen Component
 * Displays a ranked list of destination recommendations
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { RecommendationWithEstimate } from '../types';
import { RecommendationCard } from '../components/RecommendationCard';

interface RecommendationsScreenProps {
  recommendations: RecommendationWithEstimate[];
  selectedDestinationId?: string;
  onSelectDestination?: (id: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({
  recommendations,
  selectedDestinationId,
  onSelectDestination,
  loading = false,
  onRefresh,
}) => {
  const renderItem = ({
    item,
    index,
  }: {
    item: RecommendationWithEstimate;
    index: number;
  }) => (
    <RecommendationCard
      recommendation={item}
      rank={index + 1}
      isSelected={item.id === selectedDestinationId}
      onPress={() => onSelectDestination?.(item.id)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Top Destinations</Text>
      <Text style={styles.subtitle}>
        Based on your group's preferences
      </Text>
      {recommendations.length > 0 && (
        <Text style={styles.count}>
          {recommendations.length} destination{recommendations.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.emptyText}>Finding your perfect destinations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
        <Text style={styles.emptyText}>
          Set your travel preferences and tap "Get Recommendations" to find your perfect destinations.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={recommendations.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          recommendations.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor="#4A90D9"
            />
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  count: {
    fontSize: 13,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default RecommendationsScreen;
