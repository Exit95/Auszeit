import React from 'react';
import { ScrollView, View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  filters: FilterChip[];
  activeFilter: string;
  onSelect: (key: string) => void;
  /** Optionale Status-Farbe pro Filter (z. B. Grün für „aktiv"). Default: primary. */
  getColor?: (key: string) => string;
  /** 'chips': scrollbarer Chip-Strip (default). 'tabs': flex-1 Tabs in einem View. */
  variant?: 'chips' | 'tabs';
}

export function FilterChips({ filters, activeFilter, onSelect, getColor, variant = 'chips' }: FilterChipsProps) {
  const renderItem = (f: FilterChip) => {
    const isActive = activeFilter === f.key;
    const color = getColor ? getColor(f.key) : colors.primary;
    const hasCount = typeof f.count === 'number' && f.count > 0;

    if (variant === 'tabs') {
      return (
        <Pressable
          key={f.key}
          style={[
            styles.tab,
            isActive && { backgroundColor: color + '20', borderColor: color },
          ]}
          onPress={() => onSelect(f.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={hasCount ? `${f.label}, ${f.count}` : f.label}
        >
          <Text style={[styles.tabText, isActive && { color, fontWeight: fontWeight.semibold }]}>
            {f.label}
          </Text>
          {hasCount && (
            <View style={[styles.badge, { backgroundColor: isActive ? color : colors.border }]}>
              <Text style={[styles.badgeText, isActive && { color: colors.textOnPrimary }]}>
                {f.count}
              </Text>
            </View>
          )}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={f.key}
        onPress={() => onSelect(f.key)}
        style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={hasCount ? `${f.label}, ${f.count}` : f.label}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {f.label}{hasCount ? ` (${f.count})` : ''}
        </Text>
      </Pressable>
    );
  };

  if (variant === 'tabs') {
    return (
      <View style={styles.tabRow}>
        {filters.map(renderItem)}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {filters.map(renderItem)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.inkSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.inkSecondary,
  },
});
