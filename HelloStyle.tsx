import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Ionicons, Feather } from '@expo/vector-icons';

const COLORS = [
  { hex: '#1D4ED8', label: 'Blue',         usage: 'Theme, important text, widget borders' },
  { hex: '#FDE68A', label: 'Yellow',        usage: 'Theme, Drag vote bar, popup borders' },
  { hex: '#DFEDFF', label: 'Light Blue',    usage: 'Background' },
  { hex: '#FFFDF5', label: 'Light Yellow',  usage: 'Background' },
  { hex: '#64748B', label: 'Gray',          usage: 'Disabled, descriptions' },
  { hex: '#38F842', label: 'Green',         usage: 'Friend profile & activity' },
  { hex: '#A78BFA', label: 'Purple',        usage: 'Friend profile & activity' },
  { hex: '#F59E0B', label: 'Orange',        usage: 'User profile & activity' },
  { hex: '#FFFFFF', label: 'White',         usage: 'General background' },
  { hex: '#000000', label: 'Black',         usage: 'General text' },
];

const ICONS = [
  { label: 'Calendar',    component: <Ionicons name="calendar-outline"    size={28} color="#1D4ED8" /> },
  { label: 'Input',       component: <Ionicons name="text-outline"         size={28} color="#1D4ED8" /> },
  { label: 'Share',       component: <Feather  name="share-2"              size={28} color="#1D4ED8" /> },
  { label: 'Map',         component: <Feather  name="map"                  size={28} color="#1D4ED8" /> },
  { label: 'Map Pin',     component: <Ionicons name="location-outline"     size={28} color="#1D4ED8" /> },
  { label: 'Paper Plane', component: <Ionicons name="paper-plane-outline"  size={28} color="#1D4ED8" /> },
];

const HelloStyles: React.FC = () => {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  if (!fontsLoaded) return null;

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.pageTitle}>Hello Styles</Text>

      {/* Colors */}
      <Text style={styles.sectionTitle}>Color Palette</Text>
      {COLORS.map(({ hex, label, usage }) => (
        <View key={hex} style={styles.colorRow}>
          <View style={[styles.swatch, { backgroundColor: hex,
            borderWidth: hex === '#FFFFFF' ? 1 : 0, borderColor: '#ddd' }]} />
          <View>
            <Text style={styles.colorLabel}>{label}  <Text style={styles.colorHex}>{hex}</Text></Text>
            <Text style={styles.colorUsage}>{usage}</Text>
          </View>
        </View>
      ))}

      {/* Fonts */}
      <Text style={styles.sectionTitle}>Typeface — Inter</Text>
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 16, marginBottom: 6 }}>
        Inter Regular — The quick brown fox
      </Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, marginBottom: 6 }}>
        Inter Medium — The quick brown fox
      </Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 16 }}>
        Inter Bold — The quick brown fox
      </Text>

      {/* Icons */}
      <Text style={styles.sectionTitle}>Icons</Text>
      <View style={styles.iconGrid}>
        {ICONS.map(({ label, component }) => (
          <View key={label} style={styles.iconBox}>
            {component}
            <Text style={styles.iconLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default HelloStyles;

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  pageTitle:    { fontSize: 26, fontWeight: 'bold', color: '#1D4ED8', marginBottom: 24, marginTop: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12, marginTop: 8 },
  colorRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  swatch:       { width: 44, height: 44, borderRadius: 8 },
  colorLabel:   { fontSize: 14, fontWeight: '600', color: '#000' },
  colorHex:     { fontSize: 13, color: '#64748B', fontWeight: '400' },
  colorUsage:   { fontSize: 12, color: '#64748B' },
  iconGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  iconBox:      { alignItems: 'center', width: 80, gap: 6 },
  iconLabel:    { fontSize: 11, color: '#64748B', textAlign: 'center' },
});