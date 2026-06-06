import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { BrushAccent } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Booking, Inquiry, Review, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface HubCounts {
  todayBookings: number;
  todayParticipants: number;
  pendingBookings: number;
  openInquiries: number;
  pendingReviews: number;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AtelierHubScreen() {
  const navigation = useNavigation<Nav>();
  const [counts, setCounts] = useState<HubCounts>({
    todayBookings: 0,
    todayParticipants: 0,
    pendingBookings: 0,
    openInquiries: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(Platform.OS !== 'web' && !adminApi.getCredentials());
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = async () => {
    if (!password.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      await adminApi.setCredentials('admin', password.trim());
      // Test the credentials
      const apiHost =
        (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_API_HOST) ||
        'https://keramik-auszeit.de';
      const response = await fetch(`${apiHost}/api/admin/bookings`, {
        headers: { 'Authorization': `Basic ${adminApi.getCredentials()}` },
      });
      if (response.ok) {
        setNeedsLogin(false);
        setPassword('');
        loadCounts();
      } else {
        await adminApi.clearCredentials();
        setLoginError('Falsches Passwort');
      }
    } catch {
      await adminApi.clearCredentials();
      setLoginError('Verbindungsfehler');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadCounts = useCallback(async () => {
    if (Platform.OS !== 'web' && !adminApi.getCredentials()) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    try {
      setAuthError(false);
      const today = getTodayString();

      const [bookingsData, inquiriesData, reviewsData] = await Promise.allSettled([
        adminApi.get<Booking[]>('/api/admin/bookings'),
        adminApi.get<Inquiry[]>('/api/inquiries'),
        adminApi.get<Review[]>('/api/reviews', { all: 'true' }),
      ]);

      let todayBookings = 0;
      let todayParticipants = 0;
      let pendingBookings = 0;

      if (bookingsData.status === 'fulfilled') {
        const bookings = bookingsData.value;
        const todayConfirmed = bookings.filter(
          b => b.status === 'confirmed' && b.slotDate === today
        );
        todayBookings = todayConfirmed.length;
        todayParticipants = todayConfirmed.reduce((sum, b) => sum + b.participants, 0);
        pendingBookings = bookings.filter(b => b.status === 'pending').length;
      } else if (
        bookingsData.status === 'rejected' &&
        (bookingsData.reason as any)?.status === 401
      ) {
        setAuthError(true);
        await adminApi.clearCredentials();
        setNeedsLogin(true);
        return;
      }

      let openInquiries = 0;
      if (inquiriesData.status === 'fulfilled') {
        openInquiries = (inquiriesData.value as Inquiry[]).filter(
          i => i.status === 'new'
        ).length;
      }

      let pendingReviews = 0;
      if (reviewsData.status === 'fulfilled') {
        pendingReviews = (reviewsData.value as Review[]).filter(r => !r.approved).length;
      }

      setCounts({ todayBookings, todayParticipants, pendingBookings, openInquiries, pendingReviews });
    } catch (error) {
      console.error('Hub-Daten laden fehlgeschlagen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts])
  );

  const menuItems = [
    {
      icon: 'qr-code-outline' as const,
      iconFocused: 'qr-code' as const,
      title: 'Gutschein-Scanner',
      subtitle: 'QR-Code scannen & einlösen',
      badge: 0,
      color: colors.secondary,
      onPress: () => navigation.navigate('VoucherScanner'),
    },
    {
      icon: 'today-outline' as const,
      iconFocused: 'today' as const,
      title: 'Heute',
      subtitle: counts.todayBookings > 0
        ? `${counts.todayBookings} Termin${counts.todayBookings !== 1 ? 'e' : ''}, ${counts.todayParticipants} Plätze`
        : 'Keine Termine heute',
      badge: counts.todayBookings,
      color: colors.info,
      onPress: () => navigation.navigate('AtelierToday'),
    },
    {
      icon: 'calendar-outline' as const,
      iconFocused: 'calendar' as const,
      title: 'Buchungen',
      subtitle: counts.pendingBookings > 0
        ? `${counts.pendingBookings} neu${counts.pendingBookings !== 1 ? 'e' : ''} Buchung${counts.pendingBookings !== 1 ? 'en' : ''}`
        : 'Alle bearbeitet',
      badge: counts.pendingBookings,
      color: colors.warning,
      onPress: () => navigation.navigate('AtelierBookings'),
    },
    {
      icon: 'time-outline' as const,
      iconFocused: 'time' as const,
      title: 'Termine verwalten',
      subtitle: 'Zeitslots anlegen, bearbeiten, löschen',
      badge: 0,
      color: colors.primary,
      onPress: () => navigation.navigate('AtelierSlots'),
    },
    {
      icon: 'mail-outline' as const,
      iconFocused: 'mail' as const,
      title: 'Anfragen',
      subtitle: counts.openInquiries > 0
        ? `${counts.openInquiries} offene Anfrage${counts.openInquiries !== 1 ? 'n' : ''}`
        : 'Keine offenen Anfragen',
      badge: counts.openInquiries,
      color: colors.primary,
      onPress: () => navigation.navigate('AtelierInquiries'),
    },
    {
      icon: 'star-outline' as const,
      iconFocused: 'star' as const,
      title: 'Bewertungen',
      subtitle: counts.pendingReviews > 0
        ? `${counts.pendingReviews} warte${counts.pendingReviews !== 1 ? 'n' : 't'} auf Freigabe`
        : 'Alle freigegeben',
      badge: counts.pendingReviews,
      color: colors.secondary,
      onPress: () => navigation.navigate('AdminReviews'),
    },
  ];

  if (needsLogin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerInner}>
              <View>
                <Text style={styles.title}>Atelier</Text>
                <Text style={styles.subtitle}>Keramik Auszeit</Text>
              </View>
              <View style={styles.headerIcon}>
                <Ionicons name="storefront" size={28} color={colors.primary} />
              </View>
            </View>
          </View>

          <View style={styles.loginBody}>
            <View style={styles.loginCard}>
              <View style={styles.loginIconCircle}>
                <Ionicons name="lock-closed" size={32} color={colors.primary} />
              </View>
              <Text style={styles.loginTitle}>Admin-Zugang</Text>
              <Text style={styles.loginHint}>
                Gib dein Admin-Passwort ein um Buchungen, Anfragen und Bewertungen zu verwalten.
              </Text>

              <TextInput
                style={styles.loginInput}
                placeholder="Admin-Passwort"
                placeholderTextColor={colors.meta}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleAdminLogin}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
              />

              {loginError ? (
                <Text style={styles.loginErrorText}>{loginError}</Text>
              ) : null}

              <Pressable
                style={[styles.loginBtn, loginLoading && styles.loginBtnDisabled]}
                onPress={handleAdminLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.loginBtnText}>Anmelden</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCounts(); }}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.title}>Atelier</Text>
              <BrushAccent width={60} />
              <Text style={styles.subtitle}>Keramik Auszeit</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="storefront" size={28} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.body}>

          {/* Menu-Karten */}
          {menuItems.map(item => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: item.color }]}>
                    <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.meta} />
              </View>
            </Pressable>
          ))}
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.meta,
    marginTop: 2,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  authWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '18',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    marginBottom: spacing.xs,
  },
  authWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing.md,
  },
  menuCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  menuIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  // Login styles
  loginBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  loginIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  loginTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  loginHint: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  loginInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  loginErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});
