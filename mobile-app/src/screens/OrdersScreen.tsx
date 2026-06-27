import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OrderCard, EmptyState, LoadingScreen, FilterChips, ScreenHeader } from '../components';
import type { FilterChip } from '../components';
import { useOrders } from '../queries/orders';
import { colors, spacing, statusColors, statusLabels } from '../theme';
import type { RootStackParamList, OrderStatus, Order } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS: (OrderStatus | 'alle')[] = [
  'alle', 'ERFASST', 'WARTET_AUF_BRENNEN', 'IM_BRENNOFEN', 'GEBRANNT', 'ABHOLBEREIT', 'ABGEHOLT', 'STORNIERT',
];

const FILTERS: FilterChip[] = STATUS_FILTERS.map(s => ({
  key: s,
  label: s === 'alle' ? 'Alle' : statusLabels[s],
}));

function filterColor(key: string): string {
  return key === 'alle' ? colors.primary : (statusColors[key] || colors.primary);
}

export function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'alle'>('alle');
  const { data: orders = [], isLoading, isRefetching, refetch } = useOrders(activeFilter);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
    />
  ), [navigation]);

  if (isLoading && orders.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Aufträge" subtitle="Brennverwaltung" icon="document-text" />

      <FilterChips
        filters={FILTERS}
        activeFilter={activeFilter}
        onSelect={(key) => setActiveFilter(key as OrderStatus | 'alle')}
        getColor={filterColor}
      />

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
        renderItem={renderOrderItem}
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
