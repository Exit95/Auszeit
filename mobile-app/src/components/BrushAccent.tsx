import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

interface BrushAccentProps {
  width?: number;
  color?: string;
}

export function BrushAccent({ width = 74, color = colors.secondary }: BrushAccentProps) {
  const height = Math.round(width * 18 / 160);
  return (
    <Svg width={width} height={height} viewBox="0 0 160 18" preserveAspectRatio="none">
      <Path
        fill={color}
        d="M2 10 C 24 3 52 14 82 8 C 112 2 138 13 158 7 L 157 10 C 136 16 110 8 81 12 C 50 16 24 6 3 13 Z"
      />
    </Svg>
  );
}
