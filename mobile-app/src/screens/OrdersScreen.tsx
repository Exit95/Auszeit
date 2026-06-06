import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrderCard, EmptyState, LoadingScreen } from '../components';
import { useOrders } from '../queries/orders';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusColors, statusLabels } from '../theme';
import type { RootStackParamList, OrderStatus } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: (OrderStatus | 'alle')[] = [
  'alle', 'ERFASST', 'WARTET_AUF_BRENNEN', 'IM_BRENNOFEN', 'GEBRANNT', 'ABHOLBEREIT', 'ABGEHOLT', 'STORNIERT',
];

export function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'alle'>('alle');
  const { data: orders = [], isLoading, isRefetching, refetch } = useOrders(activeFilter);

  if (isLoading && orders.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter-Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map(item => {
          const isActive = item === activeFilter;
          const color = item === 'alle' ? colors.primary : (statusColors[item] || colors.primary);
          return (
            <Pressable
              key={item}
              onPress={() => setActiveFilter(item)}
              style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {item === 'alle' ? 'Alle' : statusLabels[item]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Auftragsliste */}
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Keine Aufträge"
            message={activeFilter !== 'alle'
              ? `Keine Aufträge mit Status "${statusLabels[activeFilter]}"`
              : 'Noch keine Brennaufträge vorhanden'}
          />
        }
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('OrderForm', {})}
        accessibilityLabel="Neuer Auftrag"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.inkSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  fabIcon: {
    fontSize: 26,
    color: '#fff',
    lineHeight: 30,
  },
});
