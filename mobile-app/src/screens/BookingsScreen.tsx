import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { Card, EmptyState, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Booking, BookingStatus } from '../types';

type Filter = 'pending' | 'confirmed' | 'cancelled';

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: 'pending', label: 'Neu', color: colors.warning },
  { key: 'confirmed', label: 'Bestätigt', color: colors.success },
  { key: 'cancelled', label: 'Storniert', color: colors.error },
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '–';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(time?: string | null): string {
  if (!time) return '';
  return time.substring(0, 5);
}

function formatCreatedAt(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const all = await adminApi.get<Booking[]>('/api/admin/bookings');
      setBookings(Array.isArray(all) ? all : []);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filtered = bookings
    .filter(b => b.status === activeFilter)
    .sort((a, b) => {
      // Neueste zuerst bei pending, älteste bei confirmed/cancelled
      if (activeFilter === 'pending') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (a.slotDate || '').localeCompare(b.slotDate || '');
    });

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  const handleConfirm = async (booking: Booking) => {
    Alert.alert(
      'Buchung bestätigen',
      `Buchung von ${booking.name} bestätigen?\nEine Bestätigungs-E-Mail wird automatisch gesendet.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Bestätigen',
          onPress: async () => {
            setActionLoading(booking.id);
            try {
              await adminApi.post('/api/admin/bookings', { id: booking.id, action: 'confirm' });
              await loadBookings();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Bestätigung fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (booking: Booking) => {
    Alert.alert(
      'Buchung stornieren',
      `Buchung von ${booking.name} stornieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(booking.id);
            try {
              await adminApi.post('/api/admin/bookings', { id: booking.id, action: 'cancel' });
              await loadBookings();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Stornierung fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading && bookings.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const count = bookings.filter(b => b.status === f.key).length;
          const isActive = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: f.color + '20', borderColor: f.color },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[
                styles.filterLabel,
                isActive && { color: f.color, fontWeight: fontWeight.semibold },
              ]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: isActive ? f.color : colors.border }]}>
                  <Text style={[
                    styles.filterBadgeText,
                    isActive && { color: colors.textOnPrimary },
                  ]}>
                    {count}
                  </Text>
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

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadBookings(); }}
            colors={[colors.accent]}
          />
        }
        renderItem={({ item }) => {
          const isProcessing = actionLoading === item.id;
          return (
            <Card style={[styles.card, isProcessing && styles.cardDisabled]}>
              {/* Header: Datum + Uhrzeit */}
              <View style={styles.cardHeader}>
                <View style={styles.dateTimeBadge}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={styles.dateText}>{formatDate(item.slotDate)}</Text>
                  {item.slotTime && (
                    <Text style={styles.timeText}>
                      {' · '}{formatTime(item.slotTime)}
                      {item.slotEndTime ? ` – ${formatTime(item.slotEndTime)}` : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.participantsBadge}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.participantsText}>{item.participants}</Text>
                </View>
              </View>

              {/* Kundenname */}
              <Text style={styles.customerName}>{item.name}</Text>

              {/* Kontakt */}
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={13} color={colors.textLight} />
                <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
              </View>
              {item.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={13} color={colors.textLight} />
                  <Text style={styles.contactText}>{item.phone}</Text>
                </View>
              )}

              {/* Notizen */}
              {item.notes && (
                <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
              )}

              {/* Eingangsdatum */}
              <Text style={styles.createdAt}>Eingegangen: {formatCreatedAt(item.createdAt)}</Text>

              {/* Aktionen (nur für pending) */}
              {activeFilter === 'pending' && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.confirmBtn, isProcessing && styles.btnDisabled]}
                    onPress={() => !isProcessing && handleConfirm(item)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.actionBtnText}>Bestätigen</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.cancelBtn, isProcessing && styles.btnDisabled]}
                    onPress={() => !isProcessing && handleCancel(item)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                    <Text style={[styles.actionBtnText, { color: colors.error }]}>Stornieren</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={activeFilter === 'pending' ? 'checkmark-circle-outline' : 'calendar-outline'}
            title={
              activeFilter === 'pending' ? 'Keine neuen Buchungen' :
              activeFilter === 'confirmed' ? 'Keine bestätigten Buchungen' :
              'Keine stornierten Buchungen'
            }
            message={
              activeFilter === 'pending'
                ? 'Alle Buchungen wurden bearbeitet.'
                : 'In dieser Kategorie gibt es noch keine Buchungen.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
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
    color: colors.textSecondary,
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
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  participantsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
  },
  createdAt: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
  confirmBtn: {
    backgroundColor: colors.success,
  },
  cancelBtn: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
