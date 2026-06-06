import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi } from '../api/adminClient';
import { ScreenHeader, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { TimeSlot, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BookingCreate'>;
type Rt = RouteProp<RootStackParamList, 'BookingCreate'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHuman(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return dateStr; }
}

function formatTime(t?: string): string {
  if (!t) return '';
  return t.substring(0, 5);
}

export function BookingCreateScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const preselectedSlotId = route.params?.slotId;

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slotId, setSlotId] = useState<string>(preselectedSlotId || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');

  const loadSlots = useCallback(async () => {
    try {
      setError(null);
      const all = await adminApi.get<TimeSlot[]>('/api/admin/slots');
      const today = todayString();
      // Nur kommende Termine mit freien Plätzen — nach Datum/Zeit sortiert
      const upcoming = (all || [])
        .filter((s) => s.date >= today && s.available > 0)
        .sort((a, b) =>
          a.date === b.date
            ? (a.time || '').localeCompare(b.time || '')
            : a.date.localeCompare(b.date),
        );
      setSlots(upcoming);
    } catch (err: any) {
      setError(err?.message || 'Termine konnten nicht geladen werden');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const selectedSlot = slots.find((s) => s.id === slotId);

  const validate = (): string | null => {
    if (!slotId) return 'Bitte einen Termin auswählen.';
    if (!name.trim()) return 'Bitte einen Kundennamen eingeben.';
    if (email.trim() && !EMAIL_RE.test(email.trim())) return 'E-Mail-Adresse ist ungültig (oder leer lassen).';
    const p = parseInt(participants || '0', 10);
    if (!Number.isFinite(p) || p < 1) return 'Anzahl Personen muss mindestens 1 sein.';
    if (selectedSlot && p > selectedSlot.available) {
      return `Nur noch ${selectedSlot.available} Plätze in diesem Termin frei.`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Eingabe prüfen', err);
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.post<{ success: boolean; customerEmailSent?: boolean; emailError?: string }>(
        '/api/admin/bookings',
        {
          action: 'create',
          slotId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          participants: parseInt(participants, 10),
          notes: notes.trim(),
        },
      );
      const emailHint = email.trim()
        ? res.customerEmailSent
          ? '\n\nEine Bestätigungs-E-Mail wurde an die Kund:in gesendet.'
          : '\n\nHinweis: Die Bestätigungs-E-Mail konnte nicht gesendet werden.'
        : '';
      Alert.alert('Buchung angelegt', `Die Buchung wurde gespeichert und bestätigt.${emailHint}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const status = e?.status ? ` (${e.status})` : '';
      Alert.alert('Speichern fehlgeschlagen' + status, e?.message || 'Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSlots) return <LoadingScreen />;

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
        >
          <ScreenHeader
            title="Neue Buchung"
            subtitle="Telefonische Buchung eintragen"
            icon="call-outline"
          />

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Termin-Auswahl */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Termin auswählen</Text>
            {slots.length === 0 ? (
              <Text style={styles.helperText}>
                Keine freien Termine vorhanden. Lege zuerst einen Termin an.
              </Text>
            ) : (
              <View style={styles.slotList}>
                {slots.map((s) => {
                  const isActive = s.id === slotId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSlotId(s.id)}
                      style={[styles.slotRow, isActive && styles.slotRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.slotDate, isActive && styles.slotTextActive]}>
                          {formatDateHuman(s.date)} · {formatTime(s.time)}
                          {s.endTime ? ` – ${formatTime(s.endTime)}` : ''}
                        </Text>
                        <Text style={[styles.slotMeta, isActive && styles.slotTextActive]}>
                          {s.available} von {s.maxCapacity} frei
                        </Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Kundendaten */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kundendaten</Text>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Vor- und Nachname"
              placeholderTextColor={colors.meta}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>E-Mail (optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@beispiel.de"
              placeholderTextColor={colors.meta}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              Bei hinterlegter E-Mail wird automatisch eine Bestätigung gesendet.
            </Text>

            <Text style={styles.fieldLabel}>Telefon (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+49 …"
              placeholderTextColor={colors.meta}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Anzahl Personen *</Text>
            <TextInput
              style={styles.input}
              value={participants}
              onChangeText={(t) => setParticipants(t.replace(/[^0-9]/g, ''))}
              placeholder="1"
              placeholderTextColor={colors.meta}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Notiz (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="z.B. Geburtstagsgruppe, Allergien …"
              placeholderTextColor={colors.meta}
              multiline
            />
          </View>

          {/* Speichern */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.actionBtnText, { color: colors.ink }]}>Abbrechen</Text>
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
                  <Ionicons name="save-outline" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Buchung anlegen</Text>
                </>
              )}
            </Pressable>
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
  scrollContent: { paddingBottom: spacing.lg, gap: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.ink },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.meta,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.inkSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  helperText: { fontSize: fontSize.xs, color: colors.meta },
  slotList: { gap: spacing.xs },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  slotRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  slotDate: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.ink },
  slotMeta: { fontSize: fontSize.xs, color: colors.inkSecondary, marginTop: 2 },
  slotTextActive: { color: colors.primaryDark },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  saveBtn: { backgroundColor: colors.primary },
  cancelBtn: { backgroundColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
