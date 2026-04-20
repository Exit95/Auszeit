import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OrderCard, EmptyState, LoadingScreen } from '../components';
import { useOrders } from '../queries/orders';
import { colors, spacing, fontSize, borderRadius, statusColors, statusLabels } from '../theme';
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
      {/* Status Filter (horizontal, wenig Items → FlatList ok) */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => {
          const isActive = item === activeFilter;
          const color = item === 'alle' ? colors.primary : statusColors[item];
          return (
            <Pressable
              onPress={() => setActiveFilter(item)}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: color + '20', borderColor: color },
              ]}
            >
              <Text style={[
                styles.filterText,
                isActive && { color, fontWeight: '600' },
              ]}>
                {item === 'alle' ? 'Alle' : statusLabels[item]}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Auftragsliste */}
      <FlashList
        data={orders}
        keyExtractor={item => item.id.toString()}
        estimatedItemSize={140}
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
        style={styles.fab}
        onPress={() => navigation.navigate('OrderForm', {})}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});
