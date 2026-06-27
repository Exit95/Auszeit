import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi } from '../api/adminClient';
import { Card, EmptyState, LoadingScreen, BrushAccent } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Booking, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(time?: string | null): string {
  if (!time) return '';
  return time.substring(0, 5); // HH:MM
}

function formatDateLong(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function TodayScreen() {
  const navigation = useNavigation<Nav>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const today = getTodayString();

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const all = await adminApi.get<Booking[]>('/api/admin/bookings');
      const todayConfirmed = all
        .filter(b => b.status === 'confirmed' && b.slotDate === today)
        .sort((a, b) => (a.slotTime || '').localeCompare(b.slotTime || ''));
      setBookings(todayConfirmed);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
      if (err?.status === 401) {
        setError('Keine Berechtigung — bitte Admin-Zugangsdaten hinterlegen');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  React.useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const totalParticipants = bookings.reduce((sum, b) => sum + b.participants, 0);

  const handleCall = useCallback((phone?: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`);
  }, []);

  const handleCancel = useCallback((booking: Booking) => {
    Alert.alert(
      'Buchung stornieren',
      `Buchung von ${booking.name} (heute ${formatTime(booking.slotTime)}) wirklich stornieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await adminApi.post('/api/admin/bookings', { id: booking.id, action: 'cancel' });
              await loadBookings();
              Alert.alert('Storniert', `Buchung von ${booking.name} wurde storniert.`);
            } catch (err: any) {
              const status = err?.status ? ` (${err.status})` : '';
              Alert.alert(
                'Stornierung fehlgeschlagen' + status,
                err?.message || 'Unbekannter Fehler. Bitte Internetverbindung prüfen und erneut anmelden.',
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  }, [loadBookings]);

  const renderTodayItem = useCallback(({ item }: { item: Booking }) => (
    <Card style={styles.bookingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={14} color={colors.info} />
          <Text style={styles.timeText}>
            {formatTime(item.slotTime)}
            {item.slotEndTime ? ` – ${formatTime(item.slotEndTime)}` : ''}
          </Text>
        </View>
        <View style={styles.participantsBadge}>
          <Ionicons name="people-outline" size={14} color={colors.inkSecondary} />
          <Text style={styles.participantsText}>{item.participants}</Text>
        </View>
      </View>
      <Text style={styles.customerName}>{item.name}</Text>
      {item.participantNames && item.participantNames.length > 0 && (
        <Text style={styles.participantNames}>{item.participantNames.join(', ')}</Text>
      )}
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      <View style={styles.actions}>
        {item.phone && (
          <Pressable style={styles.actionBtn} onPress={() => handleCall(item.phone)}>
            <Ionicons name="call-outline" size={16} color={colors.textOnPrimary} />
            <Text style={styles.actionBtnText}>{item.phone}</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.manageBtn}
          onPress={() => navigation.navigate('BookingDetail', { id: item.id })}
        >
          <Ionicons name="create-outline" size={16} color={colors.textOnPrimary} />
          <Text style={styles.actionBtnText}>Bearbeiten</Text>
        </Pressable>
        <Pressable
          style={[styles.cancelBtn, cancellingId === item.id && styles.btnDisabled]}
          onPress={() => cancellingId !== item.id && handleCancel(item)}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.error} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>
            {cancellingId === item.id ? 'Storniere…' : 'Stornieren'}
          </Text>
        </Pressable>
      </View>
    </Card>
  ), [cancellingId, navigation, handleCall, handleCancel]);

  if (loading && bookings.length === 0) return <LoadingScreen />;

  return (
    <FlatList
      data={bookings}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadBookings(); }}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDateLong(today)}</Text>
          <BrushAccent width={60} />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.summaryBox}>
              <Ionicons name="calendar" size={20} color={colors.info} />
              <Text style={styles.summaryText}>
                {bookings.length === 0
                  ? 'Keine Termine heute'
                  : `${bookings.length} Termin${bookings.length !== 1 ? 'e' : ''} · ${totalParticipants} Platz${totalParticipants !== 1 ? 'plätze' : ''} belegt`}
              </Text>
            </View>
          )}
        </View>
      }
      renderItem={renderTodayItem}
      ListEmptyComponent={
        !error ? (
          <EmptyState
            icon="sunny-outline"
            title="Freier Tag!"
            message="Keine bestätigten Termine für heute."
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.md,
  },
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  summaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  bookingCard: {
    marginBottom: spacing.sm,
  },
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
    backgroundColor: colors.info + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.info,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  participantsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.inkSecondary,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: 2,
  },
  participantNames: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.info,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
});
