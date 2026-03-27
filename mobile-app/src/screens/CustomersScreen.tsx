import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen, Input } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Customer, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CustomersScreen() {
  const navigation = useNavigation<Nav>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      const path = '/customers?limit=500';
      const result = await api.get<any>(path);
      const list = result?.data?.customers || result?.data || result || [];
      setCustomers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Kunden laden fehlgeschlagen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  if (loading && customers.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.textLight} />
        <Input
          label=""
          placeholder="Kunde suchen..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={customers}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCustomers(); }}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
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
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </Card>
        )}
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
  customerName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  customerDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 8,
  },
});
