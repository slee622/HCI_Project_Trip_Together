/**
 * PreferenceSliders Component
 * Allows users to set travel preferences using sliders
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  GroupPreferences,
  PreferenceDimension,
  PREFERENCE_CONFIGS,
} from '../types';

interface PreferenceSlidersProps {
  preferences: GroupPreferences;
  onPreferencesChange: (preferences: GroupPreferences) => void;
  disabled?: boolean;
}

// Simple custom slider that works on web
const SimpleSlider = ({ value, onValueChange, disabled }: {
  value: number;
  onValueChange: (val: number) => void;
  disabled?: boolean;
}) => {
  // Using createElement to avoid TypeScript JSX issues with HTML elements
  return React.createElement('input', {
    type: 'range',
    min: 0,
    max: 10,
    step: 1,
    value: value,
    onChange: (e: any) => onValueChange(parseInt(e.target.value)),
    disabled: disabled,
    style: {
      flex: 1,
      height: 40,
      margin: '0 8px',
      accentColor: '#4A90D9',
    },
  });
};

export const PreferenceSliders: React.FC<PreferenceSlidersProps> = ({
  preferences,
  onPreferencesChange,
  disabled = false,
}) => {
  const handleSliderChange = (key: PreferenceDimension, value: number) => {
    onPreferencesChange({
      ...preferences,
      [key]: Math.round(value),
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Set Your Preferences</Text>
      <Text style={styles.subtitle}>
        Adjust the sliders to match your group's travel preferences
      </Text>

      {PREFERENCE_CONFIGS.map((config) => (
        <View key={config.key} style={styles.sliderContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={styles.label}>{config.name}</Text>
            <Text style={styles.value}>{preferences[config.key]}</Text>
          </View>
          
          <View style={styles.sliderRow}>
            <Text style={styles.endLabel}>{config.lowLabel}</Text>
            <SimpleSlider
              value={preferences[config.key]}
              onValueChange={(value) => handleSliderChange(config.key, value)}
              disabled={disabled}
            />
            <Text style={styles.endLabel}>{config.highLabel}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90D9',
    width: 30,
    textAlign: 'right',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endLabel: {
    fontSize: 12,
    color: '#888',
    width: 50,
  },
});

export default PreferenceSliders;
