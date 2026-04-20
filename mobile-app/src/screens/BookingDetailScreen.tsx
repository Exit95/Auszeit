import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  TextInput, KeyboardAvoidingView, Platform, Linking, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { adminApi } from '../api/adminClient';
import { LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Booking, BookingStatus, RootStackParamList } from '../types';

type Rt = RouteProp<RootStackParamList, 'BookingDetail'>;

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: colors.warning,
  confirmed: colors.success,
  cancelled: colors.error,
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '–';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(t?: string | null): string {
  if (!t) return '';
  return t.substring(0, 5);
}

function formatCreatedAt(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoStr; }
}

export function BookingDetailScreen() {
  const route = useRoute<Rt>();
  const { id } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const applyBooking = (b: Booking) => {
    setBooking(b);
    if (!dirty) {
      setParticipants(String(b.participants || 1));
      setNotes(b.notes || '');
      setParticipantNames(Array.isArray(b.participantNames) ? [...b.participantNames] : []);
      setPhone(b.phone || '');
    }
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await adminApi.get<Booking[]>('/api/admin/bookings');
      const found = (all || []).find((b) => b.id === id);
      if (!found) {
        setError('Buchung nicht gefunden');
        return;
      }
      applyBooking(found);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dirty]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!booking) return;
    const participantsNum = parseInt(participants, 10);
    if (!Number.isFinite(participantsNum) || participantsNum < 1) {
      Alert.alert('Ungültig', 'Teilnehmerzahl muss mindestens 1 sein.');
      return;
    }
    setSaving(true);
    try {
      const cleanedNames = participantNames
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      await adminApi.put('/api/admin/bookings', {
        id: booking.id,
        participants: participantsNum,
        participantNames: cleanedNames,
        notes,
        phone,
      });
      setDirty(false);
      await load();
      Alert.alert('Gespeichert', 'Buchung wurde aktualisiert.');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Buchung konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    if (!booking || booking.status === 'confirmed') return;
    Alert.alert(
      'Buchung bestätigen',
      `Buchung von ${booking.name} bestätigen?\nEine Bestätigungs-E-Mail wird an den Kunden gesendet.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Bestätigen',
          onPress: async () => {
            setActionLoading(true);
            try {
              await adminApi.post('/api/admin/bookings', { id: booking.id, action: 'confirm' });
              await load();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Bestätigung fehlgeschlagen');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    if (!booking || booking.status === 'cancelled') return;
    Alert.alert(
      'Buchung stornieren',
      `Buchung von ${booking.name} wirklich stornieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await adminApi.post('/api/admin/bookings', { id: booking.id, action: 'cancel' });
              await load();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Stornierung fehlgeschlagen');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCall = () => {
    if (!booking?.phone) return;
    Linking.openURL(`tel:${booking.phone.replace(/\s+/g, '')}`);
  };

  const handleMailTo = () => {
    if (!booking?.email) return;
    Linking.openURL(`mailto:${booking.email}`);
  };

  const handleWhatsApp = () => {
    if (!booking?.phone) return;
    const cleaned = booking.phone.replace(/[^0-9+]/g, '');
    const normalized = cleaned.startsWith('0') ? '+49' + cleaned.slice(1) : cleaned;
    Linking.openURL(`https://wa.me/${normalized.replace('+', '')}`);
  };

  const updateParticipantName = (index: number, value: string) => {
    setParticipantNames((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
    setDirty(true);
  };

  const addParticipantName = () => {
    setParticipantNames((prev) => [...prev, '']);
    setDirty(true);
  };

  const removeParticipantName = (index: number) => {
    setParticipantNames((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  if (loading && !booking) return <LoadingScreen />;

  if (error || !booking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Buchung nicht gefunden'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[booking.status];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[colors.accent]}
            />
          }
        >
          {/* Header */}
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <View style={styles.dateChip}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateChipText}>
                  {formatDate(booking.slotDate)}
                  {booking.slotTime ? ` · ${formatTime(booking.slotTime)}` : ''}
                  {booking.slotEndTime ? ` – ${formatTime(booking.slotEndTime)}` : ''}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusPillText, { color: statusColor }]}>
                  {STATUS_LABELS[booking.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.customerName}>{booking.name}</Text>
            <Text style={styles.createdAt}>
              Eingegangen: {formatCreatedAt(booking.createdAt)}
            </Text>
            {typeof booking.slotMaxCapacity === 'number' && (
              <Text style={styles.capacityLine}>
                Slot: {booking.slotAvailable ?? '?'} / {booking.slotMaxCapacity} Plätze frei
              </Text>
            )}
          </View>

          {/* Kontakt-Aktionen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kontakt</Text>
            <Pressable style={styles.contactRow} onPress={handleMailTo}>
              <Ionicons name="mail-outline" size={16} color={colors.info} />
              <Text style={[styles.contactText, { color: colors.info }]}>{booking.email}</Text>
            </Pressable>
            {booking.phone && (
              <Pressable style={styles.contactRow} onPress={handleCall}>
                <Ionicons name="call-outline" size={16} color={colors.info} />
                <Text style={[styles.contactText, { color: colors.info }]}>{booking.phone}</Text>
              </Pressable>
            )}
            {booking.phone && (
              <View style={styles.actionGrid}>
                <Pressable style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
                  <Ionicons name="call-outline" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Anrufen</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.waBtn]} onPress={handleWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>WhatsApp</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Bearbeiten */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bearbeiten</Text>

            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t); setDirty(true); }}
              placeholder="Telefonnummer"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Teilnehmer</Text>
            <TextInput
              style={styles.input}
              value={participants}
              onChangeText={(t) => { setParticipants(t.replace(/[^0-9]/g, '')); setDirty(true); }}
              placeholder="Anzahl"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Teilnehmernamen (optional)</Text>
            {participantNames.map((n, i) => (
              <View key={i} style={styles.nameRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={n}
                  onChangeText={(t) => updateParticipantName(i, t)}
                  placeholder={`Name ${i + 1}`}
                  placeholderTextColor={colors.textLight}
                />
                <Pressable
                  style={styles.nameRemoveBtn}
                  onPress={() => removeParticipantName(i)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addNameBtn} onPress={addParticipantName}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addNameText}>Name hinzufügen</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Notizen</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={(t) => { setNotes(t); setDirty(true); }}
              placeholder="Interne Notizen …"
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
            />

            {dirty && (
              <View style={styles.saveRow}>
                <Pressable
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => {
                    setDirty(false);
                    if (booking) applyBooking(booking);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Verwerfen</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color={colors.textOnPrimary} />
                      <Text style={styles.actionBtnText}>Speichern</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Status-Aktionen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            {booking.status === 'pending' && (
              <Pressable
                style={[styles.actionBtn, styles.confirmBtn, actionLoading && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={actionLoading}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textOnPrimary} />
                <Text style={styles.actionBtnText}>Buchung bestätigen</Text>
              </Pressable>
            )}
            {booking.status !== 'cancelled' && (
              <Pressable
                style={[styles.actionBtn, styles.dangerBtn, actionLoading && styles.btnDisabled]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>
                  Buchung stornieren
                </Text>
              </Pressable>
            )}
            {booking.status === 'cancelled' && (
              <View style={styles.cancelledBox}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
                <Text style={styles.cancelledText}>Diese Buchung wurde bereits storniert.</Text>
              </View>
            )}
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.background,
  },
  errorText: {
    marginTop: spacing.md, fontSize: fontSize.md,
    color: colors.text, textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.lg, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: colors.textOnPrimary, fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.xs, flexWrap: 'wrap', gap: spacing.xs,
  },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: borderRadius.full,
  },
  dateChipText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  customerName: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text,
  },
  createdAt: { fontSize: fontSize.xs, color: colors.textLight },
  capacityLine: {
    fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4,
  },
  contactText: { fontSize: fontSize.sm, flex: 1 },
  actionGrid: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  actionBtnText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  callBtn: { backgroundColor: colors.info },
  waBtn: { backgroundColor: '#25D366' },
  confirmBtn: { backgroundColor: colors.success },
  saveBtn: { backgroundColor: colors.primary },
  cancelBtn: { backgroundColor: colors.border },
  dangerBtn: {
    backgroundColor: colors.error + '15',
    borderWidth: 1, borderColor: colors.error + '40',
  },
  btnDisabled: { opacity: 0.5 },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
    paddingVertical: 10, fontSize: fontSize.md, color: colors.text,
  },
  textarea: { minHeight: 100, paddingTop: 10 },
  nameRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  nameRemoveBtn: {
    padding: 10, backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
  },
  addNameBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingVertical: 8, alignSelf: 'flex-start',
  },
  addNameText: {
    fontSize: fontSize.sm, color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  saveRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelledBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceElevated, padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  cancelledText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
});
