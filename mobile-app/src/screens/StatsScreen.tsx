import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useStats } from '../queries/stats';

export function StatsScreen() {
  const { data: stats, isLoading, isRefetching, refetch } = useStats();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  if (isLoading && !stats) return <LoadingScreen />;

  const fmtEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

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
        <ScreenHeader title="Statistiken" subtitle="Überblick im Atelier" icon="bar-chart-outline" />

        <View style={styles.body}>
          {/* Buchungen */}
          <Text style={styles.groupTitle}>Buchungen</Text>
          <View style={styles.grid}>
            <StatTile
              icon="calendar-outline"
              value={String(stats?.bookingsThisWeek ?? 0)}
              label="Diese Woche"
              color={colors.primary}
            />
            <StatTile
              icon="calendar-number-outline"
              value={String(stats?.bookingsThisMonth ?? 0)}
              label="Dieser Monat"
              color={colors.primary}
            />
            <StatTile
              icon="people-outline"
              value={String(stats?.participantsThisMonth ?? 0)}
              label="Plätze / Monat"
              color={colors.info}
            />
            <StatTile
              icon="mail-unread-outline"
              value={String(stats?.openInquiries ?? 0)}
              label="Offene Anfragen"
              color={colors.warning}
            />
          </View>

          {/* Gutscheine */}
          <Text style={styles.groupTitle}>Gutscheine</Text>
          <View style={styles.grid}>
            <StatTile
              icon="cash-outline"
              value={fmtEur(stats?.voucherRevenueEur ?? 0)}
              label="Eingelöst"
              color={colors.success}
            />
            <StatTile
              icon="hourglass-outline"
              value={fmtEur(stats?.voucherActiveEur ?? 0)}
              label="Noch offen"
              color={colors.secondary}
            />
            <StatTile
              icon="gift-outline"
              value={String(stats?.voucherCount ?? 0)}
              label="Verkauft (gesamt)"
              color={colors.primary}
            />
          </View>

          {/* Brennaufträge */}
          <Text style={styles.groupTitle}>Brennaufträge</Text>
          <View style={styles.grid}>
            <StatTile
              icon="checkmark-done-outline"
              value={String(stats?.ordersReady ?? 0)}
              label="Abholbereit"
              color={colors.statusAbholbereit}
            />
            <StatTile
              icon="flame-outline"
              value={String(stats?.ordersInProgress ?? 0)}
              label="In Arbeit"
              color={colors.statusImOfen}
            />
            <StatTile
              icon="albums-outline"
              value={String(stats?.ordersTotal ?? 0)}
              label="Aufträge gesamt"
              color={colors.inkSecondary}
            />
          </View>

          {/* Bewertungen */}
          <Text style={styles.groupTitle}>Bewertungen</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewLeft}>
              <Text style={styles.reviewBig}>
                {stats?.reviewAvg != null ? stats.reviewAvg.toFixed(1) : '–'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={stats?.reviewAvg != null && i <= Math.round(stats.reviewAvg) ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.secondary}
                  />
                ))}
              </View>
            </View>
            <View style={styles.reviewRight}>
              <Text style={styles.reviewCount}>{stats?.reviewCount ?? 0}</Text>
              <Text style={styles.reviewCountLabel}>
                freigegebene Bewertung{(stats?.reviewCount ?? 0) !== 1 ? 'en' : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  icon, value, label, color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  groupTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.meta,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  tileLabel: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewLeft: { alignItems: 'center', gap: 4 },
  reviewBig: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.ink },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
  },
  reviewCount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.ink },
  reviewCountLabel: { fontSize: fontSize.sm, color: colors.inkSecondary },
});
