import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { pendingMutationsCount } from '../lib/offlineQueue';
import { colors, spacing, fontSize, fontWeight } from '../theme';

/**
 * Banner über dem aktuellen Screen, das anzeigt:
 * - "Offline — Änderungen werden gespeichert" wenn keine Verbindung
 * - "Synchronisiere…" wenn Mutations in der Queue
 * - Verschwindet wenn online + Queue leer
 */
export function NetworkBanner() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const slideAnim = React.useMemo(() => new Animated.Value(-50), []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Mutation-Cache observieren
    const unsub = queryClient.getMutationCache().subscribe(() => {
      setPendingCount(pendingMutationsCount(queryClient));
    });
    return unsub;
  }, [queryClient]);

  const visible = !isOnline || pendingCount > 0;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -50,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const message = !isOnline
    ? pendingCount > 0
      ? `Offline — ${pendingCount} Änderung${pendingCount === 1 ? '' : 'en'} werden gespeichert`
      : 'Keine Verbindung — Änderungen werden lokal gespeichert'
    : `Synchronisiere ${pendingCount} Änderung${pendingCount === 1 ? '' : 'en'}…`;

  const bg = !isOnline ? colors.warning : colors.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { backgroundColor: bg, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={!isOnline ? 'cloud-offline-outline' : 'sync-outline'}
        size={16}
        color={colors.textOnPrimary}
      />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 9999,
    elevation: 8,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
