import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen, Input } from '../components';
import { useCustomers } from '../queries/customers';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import type { RootStackParamList, Customer } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CustomersScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading, isRefetching, refetch } = useCustomers();

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter(c => {
      const fullName = `${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customers, search]);

  const renderCustomerItem = useCallback(({ item }: { item: Customer }) => (
    <Card onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}>
      <View style={styles.customerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.first_name || '?')[0]}{(item.last_name || '?')[0]}
          </Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {item.first_name} {item.last_name}
          </Text>
          {item.email && (
            <Text style={styles.customerDetail}>{item.email}</Text>
          )}
          {item.phone && (
            <Text style={styles.customerDetail}>{item.phone}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.meta} />
      </View>
    </Card>
  ), [navigation]);

  if (isLoading && customers.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.meta} />
        <Input
          label=""
          placeholder="Kunde suchen..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        estimatedItemSize={88}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        renderItem={renderCustomerItem}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Keine Kunden"
            message={search ? 'Keine Kunden gefunden' : 'Noch keine Kunden angelegt'}
          />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CustomerForm', {})}
      >
        <Ionicons name="person-add" size={24} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  customerInfo: { flex: 1, marginLeft: spacing.sm },
  customerName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.ink },
  customerDetail: { fontSize: fontSize.sm, color: colors.inkSecondary, marginTop: 1 },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 8,
  },
});
