import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

function ShimmerCard({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={[styles.shimmerCard, { opacity }]}>
      <View style={styles.shimmerLineShort} />
      <View style={styles.shimmerLineLong} />
      <View style={styles.shimmerLineMedium} />
    </Animated.View>
  );
}

export function LoadingScreen() {
  const brandOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(brandOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [brandOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.brandBlock, { opacity: brandOpacity }]}>
        <Text style={styles.brandScript}>Malatelier</Text>
        <Text style={styles.brandBold}>Auszeit</Text>
        <View style={styles.accentLine} />
        <Text style={styles.brandSub}>Brennverwaltung</Text>
      </Animated.View>

      <View style={styles.shimmerList}>
        <ShimmerCard delay={0} />
        <ShimmerCard delay={150} />
        <ShimmerCard delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  brandScript: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    color: colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandBold: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.brandEspresso,
    letterSpacing: 1,
    marginTop: -2,
  },
  accentLine: {
    width: 36,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
    marginVertical: spacing.sm,
  },
  brandSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  shimmerList: {
    gap: spacing.sm,
  },
  shimmerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  shimmerLineShort: {
    height: 14,
    width: '40%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  shimmerLineLong: {
    height: 10,
    width: '75%',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  shimmerLineMedium: {
    height: 10,
    width: '55%',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
  },
});
