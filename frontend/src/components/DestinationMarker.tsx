/**
 * DestinationMarker Component
 * Custom marker for destinations on the map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DestinationMarkerProps {
  rank: number;
  score: number;
  isSelected?: boolean;
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({
  rank,
  score,
  isSelected = false,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    return '#FF9800';
  };

  return (
    <View style={[styles.container, isSelected && styles.containerSelected]}>
      <View
        style={[
          styles.marker,
          { backgroundColor: getScoreColor(score) },
          isSelected && styles.markerSelected,
        ]}
      >
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View
        style={[
          styles.pointer,
          { borderTopColor: getScoreColor(score) },
          isSelected && styles.pointerSelected,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerSelected: {
    transform: [{ scale: 1.2 }],
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    borderColor: '#333',
    borderWidth: 4,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
  },
  pointerSelected: {
    borderTopWidth: 12,
    borderLeftWidth: 10,
    borderRightWidth: 10,
  },
});

export default DestinationMarker;
