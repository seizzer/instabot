import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { neu, radius as radiusToken } from '../theme/theme';

// Shared neumorphic "soft relief" surface — RN only supports one shadow per
// view, so a believable raised look needs two overlapping shadow layers
// (light top-left, dark bottom-right) behind the actual content layer.
// Used by Button's secondary/ghost variants and TextField's inset look.
export function NeuSurface({
  children,
  style,
  contentStyle,
  borderRadius = radiusToken.md,
  inset = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  borderRadius?: number;
  // "Pressed in" look (form inputs) instead of the default "raised" look
  // (buttons) — achieved by swapping which corner gets the dark vs. light
  // shadow, and toning the effect down since inputs sit lower visually.
  inset?: boolean;
}) {
  const sign = inset ? -1 : 1;
  return (
    <View style={[styles.wrapper, { borderRadius }, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.shadowLayer,
          {
            borderRadius,
            shadowColor: neu.shadowDark,
            shadowOffset: { width: sign * neu.offset, height: sign * neu.offset },
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.shadowLayer,
          {
            borderRadius,
            shadowColor: neu.shadowLight,
            shadowOffset: { width: -sign * neu.offset, height: -sign * neu.offset },
          },
        ]}
      />
      <View style={[styles.content, { borderRadius }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: neu.base },
  shadowLayer: {
    backgroundColor: neu.base,
    shadowOpacity: 1,
    shadowRadius: neu.radius,
    elevation: 4,
  },
  content: { backgroundColor: neu.base, overflow: 'hidden' },
});
