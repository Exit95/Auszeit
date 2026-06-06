import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { statusColors, colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const customerName = `${order.last_name || ''}, ${order.first_name || ''}`.trim().replace(/^,\s*/, '');
  const accentColor = statusColors[order.overall_status] || colors.primary;
  const date = new Date(order.visit_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const meta: string[] = [date];
  if (order.storage_code) meta.push(order.storage_code);
  if (order.items_summary) meta.push(order.items_summary);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
        <View style={styles.top}>
          <View style={styles.titleGroup}>
            <Text style={styles.refCode} numberOfLines={1}>{order.reference_code}</Text>
            <Text style={styles.customer} numberOfLines={1}>{customerName}</Text>
          </View>
          <StatusBadge status={order.overall_status} size="sm" />
        </View>
        <Text style={styles.meta} numberOfLines={1}>{meta.join(' · ')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  accent: {
    width: 5,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
  },
  refCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  customer: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.meta,
  },
});
