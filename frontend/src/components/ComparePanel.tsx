/**
 * ComparePanel Component
 * Left sidebar panel for comparing destinations
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
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

    // Use a counter so dragging over child elements doesn't flicker the drag state.
    // dragenter increments, dragleave decrements — only clear when counter hits 0.
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      setIsDragOver(true);
    };
    const handleDragOver = (e: DragEvent) => {
      // Must preventDefault on dragover to allow dropping
      e.preventDefault();
    };
    const handleDragLeave = () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
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

    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragenter', handleDragEnter);
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

const SWIPE_THRESHOLD = 80;

const CompareDestinationCard: React.FC<CompareDestinationCardProps> = ({
  destination,
  onRemove,
  locked = false,
}) => {
  const cardRef = useRef<View>(null);

  const handleRemove = useCallback(() => onRemove(), [onRemove]);

  useEffect(() => {
    if (locked) return;
    const el = cardRef.current as any;
    if (!el) return;

    let startX = 0;
    let isDragging = false;

    const onPointerDown = (e: any) => {
      // Only respond to primary button (left click / single touch)
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      startX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.style.transition = '';
    };

    const onPointerMove = (e: any) => {
      if (!isDragging) return;
      const delta = e.clientX - startX;
      if (delta > 0) {
        el.style.transform = `translateX(${delta}px)`;
        el.style.opacity = String(Math.max(0, 1 - delta / 150));
      }
    };

    const onPointerUp = (e: any) => {
      if (!isDragging) return;
      isDragging = false;
      const delta = e.clientX - startX;
      if (delta > SWIPE_THRESHOLD) {
        el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        el.style.transform = 'translateX(400px)';
        el.style.opacity = '0';
        setTimeout(() => handleRemove(), 200);
      } else {
        el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
        setTimeout(() => { el.style.transition = ''; }, 200);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [locked, handleRemove]);

  return (
    <View ref={cardRef} style={styles.card}>
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
