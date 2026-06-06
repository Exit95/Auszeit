import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrushAccent } from './BrushAccent';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Optionales Icon rechts (gleicher Stil wie im AtelierHub). */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  brushWidth?: number;
}

/**
 * Einheitlicher Sektion-Header mit Titel + BrushAccent darunter.
 * Gleiches Muster wie der AtelierHubScreen-Header.
 */
export function ScreenHeader({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  brushWidth = 60,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <BrushAccent width={brushWidth} />
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {icon ? (
          <View style={[styles.iconWrapper, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={icon} size={26} color={iconColor} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  titleBlock: {
    flex: 1,
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
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
