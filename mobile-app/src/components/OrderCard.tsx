import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { colors, spacing, fontSize } from '../theme';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim();

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={1}>{order.title}</Text>
          <Text style={styles.customer} numberOfLines={1}>{customerName}</Text>
        </View>
        <StatusBadge status={order.status} size="sm" />
      </View>

      <View style={styles.details}>
        {order.firing_type && (
          <View style={styles.detail}>
            <Ionicons name="flame-outline" size={14} color={colors.textLight} />
            <Text style={styles.detailText}>{order.firing_type}</Text>
          </View>
        )}
        {order.quantity > 1 && (
          <View style={styles.detail}>
            <Ionicons name="copy-outline" size={14} color={colors.textLight} />
            <Text style={styles.detailText}>{order.quantity} Stück</Text>
          </View>
        )}
        {order.kiln_name && (
          <View style={styles.detail}>
            <Ionicons name="cube-outline" size={14} color={colors.textLight} />
            <Text style={styles.detailText}>{order.kiln_name}</Text>
          </View>
        )}
        {order.desired_date && (
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={14} color={colors.textLight} />
            <Text style={styles.detailText}>
              {new Date(order.desired_date).toLocaleDateString('de-DE')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {order.price != null && (
          <Text style={styles.price}>
            {order.price.toFixed(2)} €
          </Text>
        )}
        <View style={[
          styles.paidBadge,
          { backgroundColor: order.paid ? colors.paid + '18' : colors.unpaid + '18' }
        ]}>
          <Text style={[
            styles.paidText,
            { color: order.paid ? colors.paid : colors.unpaid }
          ]}>
            {order.paid ? 'Bezahlt' : 'Offen'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
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
    marginBottom: spacing.sm,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  paidText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
