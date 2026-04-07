import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const COLORS = [
  { hex: '#1A1A2E', label: 'Dark Navy',         usage: 'Primary text, headings' },
  { hex: '#64748B', label: 'Gray',              usage: 'Secondary text, disabled' },
  { hex: '#4A90D9', label: 'Blue',             usage: 'Theme color — buttons, links, accents' },
  { hex: '#F5A623', label: 'Orange',            usage: 'Secondary theme, active states' },
  { hex: '#F59E0B', label: 'Amber',             usage: 'Highlights, warnings' },
  { hex: '#E8E8E8', label: 'Border Gray',       usage: 'Card borders, dividers' },
  { hex: '#FAFBFC', label: 'Header Background', usage: 'Header bar, top nav' },
  { hex: '#F4F5F7', label: 'Page Background',   usage: 'Screen background' },
  { hex: '#FFF8EE', label: 'Light Yellow',      usage: 'Warm background' },
  { hex: '#FFFFFF', label: 'White',             usage: 'Card backgrounds, general white' },
];

const HelloStyles: React.FC = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>

      {/* Color Palette */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Color Palette</Text>
        {COLORS.map(({ hex, label, usage }, index) => (
          <View
            key={hex}
            style={[
              styles.colorRow,
              index < COLORS.length - 1 && styles.colorRowDivider,
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: hex,
              borderWidth: hex === '#FFFFFF' || hex === '#FAFBFC' || hex === '#F4F5F7' ? 1 : 0,
              borderColor: '#ddd' }]} />
            <View>
              <Text style={styles.colorLabel}>{label}  <Text style={styles.colorHex}>{hex}</Text></Text>
              <Text style={styles.colorUsage}>{usage}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Typeface */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Typeface — System Font</Text>
        <Text style={{ fontSize: 16, fontWeight: '400', marginBottom: 6, color: '#1A1A2E' }}>
          Regular (400) — The quick brown fox
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#1A1A2E' }}>
          SemiBold (600) — The quick brown fox
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6, color: '#1A1A2E' }}>
          Bold (700) — The quick brown fox
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1A2E' }}>
          ExtraBold (800) — The quick brown fox
        </Text>
      </View>

    </ScrollView>
  );
};

export default HelloStyles;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  colorRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  colorHex: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  colorUsage: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
