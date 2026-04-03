/**
 * PreferencesPanel Component  
 * Left sidebar panel showing preference sliders
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { UserPreferences, SLIDER_CONFIGS, SliderDimension } from '../types';
import { PreferenceSlider } from './MultiUserSlider';

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onPreferenceChange: (dimension: SliderDimension, value: number) => void;
  disabled?: boolean;
}

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  preferences,
  onPreferenceChange,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PREFERENCES</Text>
      <Text style={styles.subtitle}>Move sliders to filter destinations</Text>
      
      {/* Sliders */}
      <ScrollView style={styles.sliderContainer}>
        {SLIDER_CONFIGS.map((config) => (
          <PreferenceSlider
            key={config.key}
            dimension={config.key}
            lowLabel={config.lowLabel}
            highLabel={config.highLabel}
            value={preferences[config.key]}
            onChange={(value) => onPreferenceChange(config.key, value)}
            disabled={disabled}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
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
    marginBottom: 20,
  },
  sliderContainer: {
    flex: 1,
  },
});

export default PreferencesPanel;
