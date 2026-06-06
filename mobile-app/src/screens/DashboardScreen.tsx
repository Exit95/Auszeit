import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OrderCard, LoadingScreen, EmptyState, Button, BrushAccent } from '../components';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../queries/dashboard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();
  const { data, isLoading, isRefetching, refetch } = useDashboard();

  if (isLoading && !data) return <LoadingScreen />;

  const c = data?.counters;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.greeting}>Brennverwaltung</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={colors.meta} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* Statistik-Karten */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: colors.statusWartet }]}>
              <Text style={[styles.statNumber, { color: colors.statusWartet }]}>
                {c?.wartet_auf_brennen || 0}
              </Text>
              <Text style={styles.statLabel}>Wartet</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusImOfen }]}>
              <Text style={[styles.statNumber, { color: colors.statusImOfen }]}>
                {c?.im_brennofen || 0}
              </Text>
              <Text style={styles.statLabel}>Im Ofen</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusAbholbereit }]}>
              <Text style={[styles.statNumber, { color: colors.statusAbholbereit }]}>
                {c?.abholbereit || 0}
              </Text>
              <Text style={styles.statLabel}>Abholbereit</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusErfasst }]}>
              <Text style={[styles.statNumber, { color: colors.statusErfasst }]}>
                {c?.erfasst_ohne_lagerort || 0}
              </Text>
              <Text style={styles.statLabel}>Erfasst</Text>
            </View>
          </View>

          {/* Warnungen */}
          {(c?.ueberfaellig || 0) > 0 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.warningText}>
                {c!.ueberfaellig} überfällige Aufträge
              </Text>
            </View>
          )}

          {/* Neuer Auftrag Button */}
          <Button
            title="Neuer Brennauftrag"
            onPress={() => navigation.navigate('OrderForm', {})}
            size="lg"
            icon={<Ionicons name="add" size={22} color={colors.textOnPrimary} />}
            style={styles.newOrderBtn}
          />

          {/* Nächste Schritte */}
          {(data?.next_steps?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nächste Schritte</Text>
              <BrushAccent width={60} />
              {data!.next_steps.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                />
              ))}
            </View>
          )}

          {/* Abholbereit */}
          {(data?.abholbereit_list?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Abholbereit</Text>
              <BrushAccent width={60} />
              {data!.abholbereit_list.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                />
              ))}
            </View>
          )}

          {(data?.next_steps?.length ?? 0) === 0 && (data?.abholbereit_list?.length ?? 0) === 0 && (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Alles erledigt!"
              message="Keine offenen Brennaufträge vorhanden."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.card,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.meta,
    marginTop: 2,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  newOrderBtn: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
});
