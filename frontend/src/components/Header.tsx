/**
 * Header Component
 * Top navigation bar with trip info and actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface HeaderProps {
  origin: string;
  dateRange: string;
  users?: Array<{ id: string; initial: string; color: string }>;
  onBack?: () => void;
  onDone?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  origin,
  dateRange,
  users = [],
  onBack,
  onDone,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>✈</Text>
        </View>
        <Text style={styles.title}>PLAN YOUR PERFECT TRIP</Text>
        
        {/* Origin Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{origin}</Text>
        </View>
        
        {/* Date Range */}
        <View style={styles.dateRangeBadge}>
          <Text style={styles.dateRangeText}>{dateRange}</Text>
        </View>
        
        {/* User Avatars - only show if users provided */}
        {users.length > 0 && (
          <View style={styles.avatarGroup}>
            {users.map((user) => (
              <View
                key={user.id}
                style={[styles.avatar, { backgroundColor: user.color }]}
              >
                <Text style={styles.avatarText}>{user.initial}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.rightSection}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        
        {onDone && (
          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneText}>DONE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 28,
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateRangeBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  avatarGroup: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#F5A623',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default Header;
