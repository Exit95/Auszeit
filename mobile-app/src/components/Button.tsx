import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: variantStyles.textColor }, sizeStyles.text]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const variants = {
  primary: {
    container: { backgroundColor: colors.primary } as ViewStyle,
    textColor: colors.textOnPrimary,
  },
  secondary: {
    container: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border } as ViewStyle,
    textColor: colors.text,
  },
  danger: {
    container: { backgroundColor: colors.error } as ViewStyle,
    textColor: '#FFFFFF',
  },
  ghost: {
    container: { backgroundColor: 'transparent' } as ViewStyle,
    textColor: colors.primary,
  },
};

const sizes = {
  sm: {
    container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm } as ViewStyle,
    text: { fontSize: fontSize.sm },
  },
  md: {
    container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md } as ViewStyle,
    text: { fontSize: fontSize.md },
  },
  lg: {
    container: { paddingHorizontal: spacing.xl, paddingVertical: 18 } as ViewStyle,
    text: { fontSize: fontSize.lg },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
