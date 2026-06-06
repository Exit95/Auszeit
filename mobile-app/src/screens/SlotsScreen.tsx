import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, Pressable, Alert, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi } from '../api/adminClient';
import { EmptyState, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { TimeSlot, SlotEventType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'upcoming' | 'today' | 'past' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Kommend' },
  { key: 'today', label: 'Heute' },
  { key: 'past', label: 'Vergangen' },
  { key: 'all', label: 'Alle' },
];

const EVENT_LABELS: Record<SlotEventType, string> = {
  normal: 'Termin',
  kindergeburtstag: 'Kindergeburtstag',
  stammtisch: 'Stammtisch',
};

const EVENT_COLORS: Record<SlotEventType, string> = {
  normal: colors.primary,
  kindergeburtstag: colors.secondary,
  stammtisch: colors.primary,
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHeader(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(t?: string): string {
  if (!t) return '';
  return t.substring(0, 5);
}

export function SlotsScreen() {
  const navigation = useNavigation<Nav>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('upcoming');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.get<TimeSlot[]>('/api/admin/slots');
      setSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = todayString();

  const filtered = slots.filter((s) => {
    if (activeFilter === 'today') return s.date === today;
    if (activeFilter === 'upcoming') return s.date >= today;
    if (activeFilter === 'past') return s.date < today;
    return true;
  });

  // Nach Datum gruppieren
  const grouped = filtered.reduce<Record<string, TimeSlot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const sections = Object.keys(grouped)
    .sort((a, b) => activeFilter === 'past' ? b.localeCompare(a) : a.localeCompare(b))
    .map((date) => ({
      title: date,
      data: grouped[date].sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    }));

  const handleDelete = (slot: TimeSlot) => {
    const booked = slot.maxCapacity - slot.available;
    const warning = booked > 0
      ? `\n\n⚠️ ACHTUNG: Dieser Termin hat bereits ${booked} Buchung${booked !== 1 ? 'en' : ''}! Löschen storniert die Buchungen NICHT automatisch.`
      : '';
    Alert.alert(
      'Termin löschen',
      `${formatDateHeader(slot.date)} · ${formatTime(slot.time)}${slot.endTime ? ` – ${formatTime(slot.endTime)}` : ''} wirklich löschen?${warning}`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(slot.id);
            try {
              // DELETE braucht einen Body mit der Slot-ID — nicht von adminApi.delete
              // abgedeckt (das nimmt Query-Params), deshalb direkt fetch.
              const creds = adminApi.getCredentials();
              const apiHost =
                (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_HOST) ||
                'https://keramik-auszeit.de';
              const resp = await fetch(`${apiHost}/api/admin/slots`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  ...(creds ? { Authorization: `Basic ${creds}` } : {}),
                },
                body: JSON.stringify({ id: slot.id }),
              });
              if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                let msg = text || `HTTP ${resp.status}`;
                try {
                  const parsed = JSON.parse(text);
                  if (parsed?.error) msg = parsed.error;
                } catch {}
                throw new Error(msg);
              }
              await load();
            } catch (err: any) {
              Alert.alert('Löschen fehlgeschlagen', err?.message || 'Bitte erneut versuchen.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading && slots.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = slots.filter((s) => {
            if (f.key === 'today') return s.date === today;
            if (f.key === 'upcoming') return s.date >= today;
            if (f.key === 'past') return s.date < today;
            return true;
          }).length;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterLabel, isActive && { color: colors.primary, fontWeight: fontWeight.semibold }]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: isActive ? colors.primary : colors.border }]}>
                  <Text style={[styles.filterBadgeText, isActive && { color: colors.textOnPrimary }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
          />
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{formatDateHeader(title)}</Text>
        )}
        renderItem={({ item }) => {
          const isDeleting = deletingId === item.id;
          const booked = item.maxCapacity - item.available;
          const eventType = (item.eventType || 'normal') as SlotEventType;
          const eventColor = EVENT_COLORS[eventType] || colors.primary;
          const isFull = item.available === 0;
          return (
            <View style={[styles.card, isDeleting && styles.cardDisabled]}>
              <View style={styles.cardHeader}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.timeText}>
                    {formatTime(item.time)}
                    {item.endTime ? ` – ${formatTime(item.endTime)}` : ''}
                  </Text>
                </View>
                <View style={[styles.eventChip, { backgroundColor: eventColor + '18' }]}>
                  <Text style={[styles.eventChipText, { color: eventColor }]}>
                    {EVENT_LABELS[eventType]}
                  </Text>
                </View>
              </View>

              <View style={styles.capacityRow}>
                <Ionicons name="people-outline" size={15} color={colors.inkSecondary} />
                <Text style={styles.capacityText}>
                  {booked} / {item.maxCapacity} gebucht
                </Text>
                {isFull && (
                  <View style={styles.fullPill}>
                    <Text style={styles.fullPillText}>AUSGEBUCHT</Text>
                  </View>
                )}
                {!isFull && item.available <= 2 && (
                  <View style={styles.warnPill}>
                    <Text style={styles.warnPillText}>Nur noch {item.available} frei</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => navigation.navigate('SlotForm', { id: item.id })}
                  disabled={isDeleting}
                >
                  <Ionicons name="create-outline" size={15} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Bearbeiten</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.deleteBtn, isDeleting && styles.btnDisabled]}
                  onPress={() => !isDeleting && handleDelete(item)}
                  disabled={isDeleting}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.error} />
                  <Text style={[styles.actionBtnText, { color: colors.error }]}>
                    {isDeleting ? 'Lösche…' : 'Löschen'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={
              activeFilter === 'today' ? 'Heute keine Termine' :
              activeFilter === 'upcoming' ? 'Keine kommenden Termine' :
              activeFilter === 'past' ? 'Keine vergangenen Termine' :
              'Keine Termine angelegt'
            }
            message="Neue Termine über den Plus-Button unten rechts anlegen."
          />
        }
      />

      {/* FAB: Neuer Slot */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('SlotForm', {})}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterLabel: { fontSize: fontSize.sm, color: colors.inkSecondary },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.inkSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.ink },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 60,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDisabled: { opacity: 0.5 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  eventChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  eventChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  capacityText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  fullPill: {
    marginLeft: 'auto',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  fullPillText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.error,
    letterSpacing: 0.5,
  },
  warnPill: {
    marginLeft: 'auto',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  warnPillText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  editBtn: { backgroundColor: colors.primary },
  deleteBtn: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
