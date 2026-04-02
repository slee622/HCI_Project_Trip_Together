/**
 * RecommendationCard Component
 * Displays a single destination recommendation with cost estimate
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { RecommendationWithEstimate } from '../types';

interface RecommendationCardProps {
  recommendation: RecommendationWithEstimate;
  rank: number;
  onPress?: () => void;
  isSelected?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  rank,
  onPress,
  isSelected = false,
}) => {
  const { city, state, score, reason, estimate } = recommendation;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    return '#FF9800';
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.city}>{city}</Text>
          <Text style={styles.state}>{state}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      <Text style={styles.reason}>{reason}</Text>

      {estimate && (
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Cost</Text>
            <View style={styles.priceRange}>
              <Text style={styles.priceLow}>
                {formatCurrency(estimate.low)}
              </Text>
              <Text style={styles.priceDash}> – </Text>
              <Text style={styles.priceHigh}>
                {formatCurrency(estimate.high)}
              </Text>
            </View>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownText}>
              {estimate.breakdown.nights} nights • {estimate.breakdown.roomsNeeded} room{estimate.breakdown.roomsNeeded > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {onPress && (
        <View style={styles.actionHint}>
          <Text style={styles.actionText}>Tap to view on map →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#F5F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  titleContainer: {
    flex: 1,
  },
  city: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  state: {
    fontSize: 14,
    color: '#666',
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reason: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  priceDash: {
    fontSize: 14,
    color: '#888',
  },
  priceHigh: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakdownRow: {
    marginTop: 4,
  },
  breakdownText: {
    fontSize: 12,
    color: '#888',
  },
  actionHint: {
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 12,
    color: '#4A90D9',
    fontWeight: '500',
  },
});

export default RecommendationCard;
