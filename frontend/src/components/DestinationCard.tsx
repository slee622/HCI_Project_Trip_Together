/**
 * DestinationCard Component
 * Card displayed when a map marker is selected
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { RecommendationWithEstimate } from '../types';

interface DestinationCardProps {
  destination: RecommendationWithEstimate;
  onClose?: () => void;
  onViewDetails?: () => void;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onClose,
  onViewDetails,
}) => {
  const { city, state, score, reason, estimate } = destination;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    return '#FF9800';
  };

  return (
    <View style={styles.card}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.city}>{city}</Text>
          <Text style={styles.state}>{state}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.scoreLabel}>match</Text>
        </View>
      </View>

      <Text style={styles.reason}>{reason}</Text>

      {estimate && (
        <View style={styles.priceContainer}>
          <View style={styles.priceHeader}>
            <Text style={styles.priceTitle}>Trip Estimate</Text>
            <Text style={styles.tripDetails}>
              {estimate.breakdown.nights} nights • {estimate.breakdown.roomsNeeded} room{estimate.breakdown.roomsNeeded > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceValue}>{formatCurrency(estimate.low)}</Text>
              <Text style={styles.priceLabel}>Budget</Text>
            </View>
            <View style={[styles.priceItem, styles.priceItemCenter]}>
              <Text style={styles.priceValueMain}>{formatCurrency(estimate.mid)}</Text>
              <Text style={styles.priceLabel}>Expected</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceValue}>{formatCurrency(estimate.high)}</Text>
              <Text style={styles.priceLabel}>Comfort</Text>
            </View>
          </View>

          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownItem}>
              ✈️ ~{formatCurrency(estimate.breakdown.flightPerPersonEstimate)}/person flight
            </Text>
            <Text style={styles.breakdownItem}>
              🏨 ~{formatCurrency(estimate.breakdown.hotelPerNightEstimate)}/night hotel
            </Text>
          </View>
        </View>
      )}

      {onViewDetails && (
        <TouchableOpacity style={styles.detailsButton} onPress={onViewDetails}>
          <Text style={styles.detailsButtonText}>View Full Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 24,
  },
  titleContainer: {
    flex: 1,
  },
  city: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  state: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  reason: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceHeader: {
    marginBottom: 12,
  },
  priceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  tripDetails: {
    fontSize: 12,
    color: '#888',
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  priceValueMain: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90D9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  breakdownItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  detailsButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DestinationCard;
