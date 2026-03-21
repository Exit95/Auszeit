import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, OrderCard, EmptyState, StatusBadge } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusLabels } from '../theme';
import type { Order, Customer, RootStackParamList, OrderStatus } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type SearchResult = {
  type: 'order';
  data: Order;
} | {
  type: 'customer';
  data: Customer;
};

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [filterPaid, setFilterPaid] = useState<'' | 'true' | 'false'>('');

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !filterStatus && !filterPaid) return;

    setLoading(true);
    setSearched(true);
    try {
      const combined: SearchResult[] = [];

      // Aufträge suchen
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      if (filterStatus) params.set('status', filterStatus);
      if (filterPaid) params.set('paid', filterPaid);

      const orders = await api.get<Order[]>(`/orders?${params.toString()}`);
      orders.forEach(o => combined.push({ type: 'order', data: o }));

      // Kunden suchen (nur bei Textsuche)
      if (query.trim() && !filterStatus && !filterPaid) {
        const customers = await api.get<Customer[]>(`/customers/search?q=${encodeURIComponent(query.trim())}`);
        customers.forEach(c => combined.push({ type: 'customer', data: c }));
      }

      setResults(combined);
    } catch (error) {
      console.error('Suche fehlgeschlagen:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filterStatus, filterPaid]);

  return (
    <View style={styles.container}>
      {/* Suchleiste */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kunde, Auftrag, Werkstück..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </Pressable>
        )}
      </View>

      {/* Filter */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: '', label: 'Alle Status' },
            ...Object.entries(statusLabels).map(([key, label]) => ({ key, label })),
          ]}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setFilterStatus(item.key as OrderStatus | ''); }}
              style={[styles.filterChip, filterStatus === item.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filterStatus === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.filterList}
        />

        <View style={styles.paidFilter}>
          {['', 'true', 'false'].map(v => (
            <Pressable
              key={v}
              onPress={() => setFilterPaid(v as '' | 'true' | 'false')}
              style={[styles.filterChip, filterPaid === v && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filterPaid === v && styles.filterTextActive]}>
                {v === '' ? 'Alle' : v === 'true' ? 'Bezahlt' : 'Offen'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={handleSearch} style={styles.searchButton}>
          <Ionicons name="search" size={18} color={colors.textOnPrimary} />
          <Text style={styles.searchButtonText}>Suchen</Text>
        </Pressable>
      </View>

      {/* Ergebnisse */}
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.type}-${item.type === 'order' ? item.data.id : item.data.id}-${index}`}
        contentContainerStyle={styles.results}
        renderItem={({ item }) => {
          if (item.type === 'order') {
            return (
              <OrderCard
                order={item.data}
                onPress={() => navigation.navigate('OrderDetail', { id: item.data.id })}
              />
            );
          }
          const customer = item.data as Customer;
          return (
            <Card onPress={() => navigation.navigate('CustomerDetail', { id: customer.id })}>
              <View style={styles.customerResult}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customer.first_name} {customer.last_name}
                  </Text>
                  {customer.email && <Text style={styles.customerDetail}>{customer.email}</Text>}
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          searched ? (
            <EmptyState icon="search-outline" title="Keine Ergebnisse" message="Versuche andere Suchbegriffe oder Filter" />
          ) : (
            <EmptyState icon="search-outline" title="Suche" message="Suche nach Kunden, Aufträgen oder filtere nach Status" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, margin: spacing.md,
    paddingHorizontal: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  searchInput: {
    flex: 1, paddingVertical: 14, fontSize: fontSize.md, color: colors.text,
  },
  filters: { paddingHorizontal: spacing.md },
  filterList: { gap: spacing.sm, marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs, color: colors.textSecondary },
  filterTextActive: { color: colors.textOnPrimary, fontWeight: '600' },
  paidFilter: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 10,
    borderRadius: borderRadius.md, gap: spacing.xs, marginBottom: spacing.sm,
  },
  searchButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: fontSize.sm },
  results: { padding: spacing.md, paddingBottom: 100 },
  customerResult: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customerInfo: { flex: 1 },
  customerName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  customerDetail: { fontSize: fontSize.sm, color: colors.textSecondary },
});
