import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, statusLabels, borderRadius, fontSize } from '../theme';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = statusColors[status] || '#888';
  const label = statusLabels[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, size === 'sm' && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textSm: {
    fontSize: fontSize.xs,
  },
});
