/**
 * ComparePanel Component
 * Left sidebar panel for comparing destinations
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CompareDestination } from '../types';

interface ComparePanelProps {
  destinations: CompareDestination[];
  onCompare: () => void;
  onRemoveDestination: (id: string) => void;
  onDropDestination?: (dest: CompareDestination) => void;
  locked?: boolean;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({
  destinations,
  onCompare,
  onRemoveDestination,
  onDropDestination,
  locked = false,
}) => {
  const canCompare = destinations.length >= 2 && !locked;
  const containerRef = useRef<View>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const el = containerRef.current as any;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      try {
        const data = JSON.parse((e as any).dataTransfer?.getData('application/json') || '{}');
        if (data.id && onDropDestination) {
          onDropDestination(data as CompareDestination);
        }
      } catch {
        // ignore malformed data
      }
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, [onDropDestination]);

  return (
    <View ref={containerRef} style={[styles.container, isDragOver && styles.containerDragOver]}>
      <Text style={styles.title}>COMPARE</Text>
      <Text style={styles.subtitle}>Swipe right to remove</Text>

      <TouchableOpacity
        style={[styles.compareButton, !canCompare && styles.compareButtonDisabled]}
        onPress={onCompare}
        disabled={!canCompare}
      >
        <Text style={styles.compareButtonText}>CLICK TO COMPARE</Text>
      </TouchableOpacity>

      <View style={[styles.dropZone, isDragOver && styles.dropZoneActive]}>
        <Text style={styles.dropZoneText}>
          {isDragOver ? 'Release to add' : 'Drag a destination here'}
        </Text>
      </View>
      
      <ScrollView style={styles.destinationList} nestedScrollEnabled>
        {destinations.map((dest) => (
          <CompareDestinationCard
            key={dest.id}
            destination={dest}
            onRemove={() => onRemoveDestination(dest.id)}
            locked={locked}
          />
        ))}
      </ScrollView>
    </View>
  );
};

interface CompareDestinationCardProps {
  destination: CompareDestination;
  onRemove: () => void;
  locked?: boolean;
}

const CompareDestinationCard: React.FC<CompareDestinationCardProps> = ({
  destination,
  onRemove,
  locked = false,
}) => {
  return (
    <View style={styles.card}>
      {!locked && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Text style={styles.removeText}>×</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.cardCity}>{destination.city}, {destination.state}</Text>
      <Text style={styles.cardCategory}>{destination.category}</Text>
      <Text style={styles.cardPrice}>{destination.priceRange}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  containerDragOver: {
    borderWidth: 2,
    borderColor: '#F5A623',
    backgroundColor: '#FFF8EE',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  compareButton: {
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  compareButtonDisabled: {
    backgroundColor: '#FFD699',
  },
  compareButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CCD6E0',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  dropZoneActive: {
    borderColor: '#F5A623',
    backgroundColor: '#FFF8EE',
  },
  dropZoneText: {
    fontSize: 13,
    color: '#999',
  },
  destinationList: {
    maxHeight: 300,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 8,
    padding: 4,
  },
  removeText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '300',
  },
  cardCity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: '#F5A623',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 12,
    color: '#666',
  },
});

export default ComparePanel;
