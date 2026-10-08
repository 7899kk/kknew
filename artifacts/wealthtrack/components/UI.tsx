import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  padding = 16,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
}) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.destructive
      : variant === "secondary"
      ? colors.secondary
      : "transparent";
  const fg =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "danger"
      ? colors.destructiveForeground
      : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        if (!disabled && !loading) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          opacity: pressed || disabled ? 0.7 : 1,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && (
            <Feather name={icon as any} size={18} color={fg} />
          )}
          <Text style={{ color: fg, fontWeight: "600", fontSize: 15 }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  prefix,
  style,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  multiline?: boolean;
  prefix?: string;
  style?: ViewStyle;
  editable?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.mutedForeground,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.secondary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          minHeight: 48,
        }}
      >
        {prefix && (
          <Text style={{ color: colors.mutedForeground, marginRight: 6, fontSize: 16 }}>
            {prefix}
          </Text>
        )}
        <TextInput
          accessibilityLabel={label || placeholder}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          style={{
            flex: 1,
            color: colors.foreground,
            fontSize: 16,
            paddingVertical: 10,
            minHeight: multiline ? 80 : undefined,
          }}
        />
      </View>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 4,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
        }}
      >
        {title}
      </Text>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  amount,
  value,
  color,
  icon,
  subtitle,
  sub,
  style,
}: {
  label: string;
  amount?: number;
  value?: string;
  color?: string;
  icon?: string;
  subtitle?: string;
  sub?: string;
  style?: ViewStyle;
}) {
  const colors = useColors();
  const displayValue = value ?? (amount !== undefined ? formatCurrency(amount) : "—");
  return (
    <Card style={style}>
      {icon && color && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: color + "22",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <Feather name={icon as any} size={18} color={color} />
        </View>
      )}
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 4 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: color ?? colors.foreground,
          fontFamily: "Inter_700Bold",
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {displayValue}
      </Text>
      {(subtitle ?? sub) && (
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
          {subtitle ?? sub}
        </Text>
      )}
    </Card>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({
  progress,
  color,
  height = 8,
}: {
  progress: number;
  color: string;
  height?: number;
}) {
  const colors = useColors();
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View
      style={{
        height,
        backgroundColor: colors.secondary,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg ?? color + "22",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  const colors = useColors();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 8,
      }}
    />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  emoji,
  title,
  subtitle,
}: {
  icon?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        {emoji ? (
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
        ) : (
          <Feather name={(icon ?? "inbox") as any} size={28} color={colors.mutedForeground} />
        )}
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.foreground,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ── Pill Selector ─────────────────────────────────────────────────────────────
export function PillSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(opt);
          }}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: value === opt ? colors.primary : colors.secondary,
            borderWidth: 1,
            borderColor: value === opt ? colors.primary : colors.border,
          }}
        >
          <Text
            style={{
              color: value === opt ? colors.primaryForeground : colors.foreground,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function profitLoss(invested: number, current: number) {
  const pl = current - invested;
  const pct = invested > 0 ? (pl / invested) * 100 : 0;
  return { pl, pct, isProfit: pl >= 0 };
}

const styles = StyleSheet.create({});
