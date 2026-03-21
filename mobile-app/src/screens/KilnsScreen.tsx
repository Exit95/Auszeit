import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Kiln, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function KilnsScreen() {
  const navigation = useNavigation<Nav>();
  const [kilns, setKilns] = useState<Kiln[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadKilns = useCallback(async () => {
    try {
      const result = await api.get<Kiln[]>('/kilns');
      setKilns(result);
    } catch (error) {
      console.error('Öfen laden fehlgeschlagen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadKilns(); }, [loadKilns]));

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={kilns}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadKilns(); }}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('KilnDetail', { id: item.id })}>
            <View style={styles.kilnRow}>
              <View style={[styles.kilnIcon, !item.active && styles.kilnIconInactive]}>
                <Ionicons name="flame" size={24} color={item.active ? colors.accent : colors.textLight} />
              </View>
              <View style={styles.kilnInfo}>
                <Text style={styles.kilnName}>{item.name}</Text>
                {item.max_temp && (
                  <Text style={styles.kilnDetail}>Max. {item.max_temp} °C</Text>
                )}
                {item.description && (
                  <Text style={styles.kilnDetail} numberOfLines={1}>{item.description}</Text>
                )}
              </View>
              <View style={[
                styles.statusDot,
                { backgroundColor: item.active ? colors.success : colors.textLight },
              ]} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" title="Keine Öfen" message="Noch keine Brennöfen angelegt" />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('KilnForm', {})}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  kilnRow: { flexDirection: 'row', alignItems: 'center' },
  kilnIcon: {
    width: 48, height: 48, borderRadius: borderRadius.md,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  kilnIconInactive: { backgroundColor: colors.surfaceElevated },
  kilnInfo: { flex: 1, marginLeft: spacing.sm },
  kilnName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  kilnDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
});
