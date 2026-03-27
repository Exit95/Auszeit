import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
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

  return (
    <Card onPress={onPress} style={styles.cardOverride}>
      <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.refCode} numberOfLines={1}>{order.reference_code}</Text>
            <Text style={styles.customer} numberOfLines={1}>{customerName}</Text>
          </View>
          <StatusBadge status={order.overall_status} size="sm" />
        </View>

        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={14} color={colors.textLight} />
            <Text style={styles.detailText}>
              {new Date(order.visit_date).toLocaleDateString('de-DE')}
            </Text>
          </View>
          {order.storage_code && (
            <View style={styles.detail}>
              <Ionicons name="location-outline" size={14} color={colors.textLight} />
              <Text style={styles.detailText}>{order.storage_code}</Text>
            </View>
          )}
          {order.items_summary && (
            <View style={styles.detail}>
              <Ionicons name="pricetag-outline" size={14} color={colors.textLight} />
              <Text style={styles.detailText}>{order.items_summary}</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardOverride: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBorder: {
    width: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  refCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.brandEspresso,
    letterSpacing: 0.3,
  },
  customer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
});
