import React from "react";
import { View, Text } from "react-native";
import Svg, {
  Path,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useColors } from "@/hooks/useColors";
export function BalanceChart({
  data,
  width = 340,
  height = 108,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  const c = useColors(),
    points = data.length > 1 ? data : [data[0] || 0, data[0] || 0];
  const min = Math.min(...points),
    max = Math.max(...points),
    range = max - min;
  const path = points
    .map(
      (n, i) =>
        `${i ? "L" : "M"} ${(i / (points.length - 1)) * width} ${range ? height - 12 - ((n - min) / range) * (height - 28) : height / 2}`,
    )
    .join(" ");
  return (
    <View accessibilityLabel="Budget balance graph">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="ivory-balance-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.gold} stopOpacity={0.3} />
            <Stop offset="1" stopColor={c.gold} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#ivory-balance-fill)"
        />
        <Path d={path} stroke={c.gold} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}
export function SpendingBars({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const c = useColors(),
    max = Math.max(1, ...values);
  const w = 320,
    h = 112,
    step = w / Math.max(1, values.length);
  return (
    <View accessibilityLabel="Monthly spending bar graph">
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <Line x1={0} x2={w} y1={100} y2={100} stroke={c.border} />
        {values.map((v, i) => (
          <Rect
            key={i}
            x={i * step + step * 0.3}
            y={100 - (v / max) * 90}
            width={Math.max(3, step * 0.38)}
            height={Math.max(v ? 2 : 0, (v / max) * 90)}
            rx={3}
            fill={i === values.length - 1 ? c.gold : "#DFE1D8"}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ fontSize: 10, color: c.mutedForeground }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
