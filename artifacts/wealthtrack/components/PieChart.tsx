/**
 * Animated SVG Donut Pie Chart — Pro Financier
 * Uses react-native-svg for crisp native rendering.
 * useNativeDriver: false for cross-platform web + native compat.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Text, useWindowDimensions, View } from "react-native";
import { G, Path, Svg } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/components/UI";

export interface PieSlice {
  value: number;
  color: string;
  label: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = Math.min(endAngle - startAngle, 359.99);
  const end = startAngle + sweep;
  const large = sweep > 180 ? 1 : 0;

  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, end);
  const i1 = polarToCartesian(cx, cy, innerR, end);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${o1.x.toFixed(4)} ${o1.y.toFixed(4)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(4)} ${o2.y.toFixed(4)}`,
    `L ${i1.x.toFixed(4)} ${i1.y.toFixed(4)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(4)} ${i2.y.toFixed(4)}`,
    "Z",
  ].join(" ");
}

interface Props {
  slices: PieSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: number;
  showLegend?: boolean;
}

export function PieChart({
  slices,
  size,
  thickness = 36,
  centerLabel = "Total",
  centerValue,
  showLegend = true,
}: Props) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const chartSize = size ?? Math.min(screenWidth - 80, 240);
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const outerR = chartSize / 2 - 6;
  const innerR = outerR - thickness;

  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const nonEmpty = slices.filter((sl) => sl.value > 0);

  // Cross-platform fade + scale in — useNativeDriver:false works on both web and native
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 420,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, []);

  if (total === 0 || nonEmpty.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 24 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No data to display</Text>
      </View>
    );
  }

  let currentAngle = 0;
  const paths = nonEmpty.map((sl) => {
    const startAngle = currentAngle;
    const sweep = (sl.value / total) * 360;
    currentAngle += sweep;
    return { ...sl, startAngle, endAngle: currentAngle };
  });

  const displayTotal = centerValue ?? total;

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <View style={{ alignItems: "center" }}>
        {/* SVG Donut */}
        <View style={{ position: "relative", width: chartSize, height: chartSize }}>
          <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
            <G>
              {paths.map((sl, i) => (
                <Path
                  key={i}
                  d={arcPath(cx, cy, outerR, innerR, sl.startAngle, sl.endAngle)}
                  fill={sl.color}
                  strokeWidth={1.5}
                  stroke={colors.background}
                />
              ))}
            </G>
          </Svg>
          {/* Center label overlay */}
          <View
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{
              fontSize: 11,
              color: colors.mutedForeground,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              {centerLabel}
            </Text>
            <Text
              style={{
                fontSize: chartSize < 180 ? 14 : 17,
                fontWeight: "700",
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                maxWidth: innerR * 1.6,
                textAlign: "center",
              }}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {formatCurrency(displayTotal)}
            </Text>
          </View>
        </View>

        {/* Legend */}
        {showLegend && (
          <View style={{ width: "100%", marginTop: 16, gap: 8 }}>
            {paths.map((sl, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: sl.color }} />
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 13, fontWeight: "500" }}>
                  {sl.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, minWidth: 36, textAlign: "right" }}>
                  {total > 0 ? Math.round((sl.value / total) * 100) : 0}%
                </Text>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", minWidth: 80, textAlign: "right" }}>
                  {formatCurrency(sl.value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
