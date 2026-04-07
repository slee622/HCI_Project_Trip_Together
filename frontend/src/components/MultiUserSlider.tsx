/**
 * PreferenceSlider Component
 * Single draggable slider for one preference dimension
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SliderDimension } from '../types';

export interface SliderMemberMarker {
  userId: string;
  initial: string;
  color: string;
  value: number; // 0-10
  label?: string;
}

interface PreferenceSliderProps {
  dimension: SliderDimension;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
  memberMarkers?: SliderMemberMarker[];
  disabled?: boolean;
}

export const PreferenceSlider: React.FC<PreferenceSliderProps> = ({
  dimension,
  lowLabel,
  highLabel,
  value,
  onChange,
  memberMarkers = [],
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPositionPercent = (val: number) => (val / 10) * 100;

  // Handle mouse/touch dragging on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.round((percent / 100) * 10);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    
    // Also update value on click
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newValue = Math.round((percent / 100) * 10);
      onChange(newValue);
    }
  }, [disabled, onChange]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.lowLabel}>{lowLabel}</Text>
          <Text style={styles.highLabel}>{highLabel}</Text>
        </View>
        
        {React.createElement('div', {
          ref: trackRef,
          onMouseDown: handleMouseDown,
          style: {
            height: 40,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            cursor: disabled ? 'default' : 'pointer',
          },
        }, [
          // Track background
          React.createElement('div', {
            key: 'track-bg',
            style: {
              position: 'absolute',
              left: 0,
              right: 0,
              height: 8,
              backgroundColor: '#E8E8E8',
              borderRadius: 4,
            }
          }),
          // Track fill
          React.createElement('div', {
            key: 'track-fill',
            style: {
              position: 'absolute',
              left: 0,
              width: `${getPositionPercent(value)}%`,
              height: 8,
              backgroundColor: '#4A90D9',
              borderRadius: 4,
              zIndex: 2,
              transition: isDragging ? 'none' : 'width 0.1s ease-out',
            }
          }),
          ...memberMarkers.map((marker) =>
            React.createElement(
              'div',
              {
                key: `member-${dimension}-${marker.userId}`,
                title: `${marker.label || marker.initial}: ${marker.value}`,
                style: {
                  position: 'absolute',
                  left: `${getPositionPercent(marker.value)}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: marker.color,
                  border: '2px solid white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  zIndex: 6,
                  pointerEvents: 'none',
                },
              },
              marker.initial
            )
          ),
          // Thumb
          React.createElement('div', {
            key: 'thumb',
            style: {
              position: 'absolute',
              left: `${getPositionPercent(value)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#4A90D9',
              border: '3px solid white',
              boxShadow: isDragging 
                ? '0 4px 12px rgba(0,0,0,0.3)' 
                : '0 2px 6px rgba(0,0,0,0.2)',
              cursor: disabled ? 'default' : 'grab',
              transition: isDragging ? 'none' : 'box-shadow 0.2s',
              zIndex: 10,
            }
          }),
        ])}
      </View>
    );
  }

  // React Native fallback
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.lowLabel}>{lowLabel}</Text>
        <Text style={styles.highLabel}>{highLabel}</Text>
      </View>
      <View style={styles.sliderTrack}>
        <View style={styles.trackBackground} />
        <View style={[styles.trackFill, { width: `${getPositionPercent(value)}%` }]} />
        {memberMarkers.map((marker) => (
          <View
            key={`member-${dimension}-${marker.userId}`}
            style={[
              styles.memberMarker,
              {
                left: `${getPositionPercent(marker.value)}%`,
                backgroundColor: marker.color,
              },
            ]}
          >
            <Text style={styles.memberMarkerText}>{marker.initial}</Text>
          </View>
        ))}
        <View style={[styles.thumb, { left: `${getPositionPercent(value)}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lowLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  highLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  sliderTrack: {
    height: 40,
    position: 'relative',
    justifyContent: 'center',
  },
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    backgroundColor: '#4A90D9',
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4A90D9',
    marginLeft: -12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  memberMarker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  memberMarkerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default PreferenceSlider;
