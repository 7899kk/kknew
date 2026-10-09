import { validMoney, validDate, localDate } from "@/utils/financeValidation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Button, Input } from "@/components/UI";

const steps = [
  {
    id: "welcome",
    title: "Welcome to Pro Financier",
    subtitle: "Your complete financial life, beautifully organized in one place.",
    icon: "activity",
  },
  {
    id: "income",
    title: "What's your income?",
    subtitle: "We'll help you understand your cash flow.",
    icon: "dollar-sign",
  },
  {
    id: "savings",
    title: "Your current savings",
    subtitle: "How much have you already saved?",
    icon: "save",
  },
  {
    id: "goals",
    title: "Your dreams",
    subtitle: "What are you saving towards?",
    icon: "star",
  },
  {
    id: "done",
    title: "You're all set!",
    subtitle: "Let's start tracking your wealth journey.",
    icon: "check-circle",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, addGoal } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [monthly, setMonthly] = useState("");
  const [other, setOther] = useState("");
  const [savings, setSavings] = useState("");
  const [bikeName, setBikeName] = useState("Dream Bike");
  const [bikePrice, setBikePrice] = useState("");
  const [carName, setCarName] = useState("Dream Car");
  const [carPrice, setCarPrice] = useState("");
  const [flatName, setFlatName] = useState("Dream Home");
  const [flatPrice, setFlatPrice] = useState("");

  const current = steps[step];
  const totalSteps = steps.length;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const finish = () => {
    if (![monthly,other,savings].every(v=>validMoney(v,true,true)) || ![bikePrice,carPrice,flatPrice].every(v=>validMoney(v,false,true))) { Alert.alert("Check amounts", "Enter valid income/savings and positive goal prices."); return; }
    updateProfile({
      name: name.trim() || "Friend",
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || name.toLowerCase().replace(/\s+/g, "_"),
      monthlySalary: parseFloat(monthly) || 0,
      yearlySalary: (parseFloat(monthly) || 0) * 12,
      otherIncome: parseFloat(other) || 0,
      currentSavings: parseFloat(savings) || 0,
      onboardingComplete: true,
    });

    if (bikePrice) {
      addGoal({
        name: bikeName,
        targetAmount: parseFloat(bikePrice),
        savedAmount: 0,
        emoji: "🏍",
      });
    }
    if (carPrice) {
      addGoal({
        name: carName,
        targetAmount: parseFloat(carPrice),
        savedAmount: 0,
        emoji: "🚗",
      });
    }
    if (flatPrice) {
      addGoal({
        name: flatName,
        targetAmount: parseFloat(flatPrice),
        savedAmount: 0,
        emoji: "🏠",
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return validMoney(monthly,true);
    return true;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                height: 4,
                flex: i <= step ? 2 : 1,
                borderRadius: 2,
                backgroundColor: i <= step ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        {/* Icon */}
        {step === 0 ? (
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 24,
              overflow: "hidden",
              marginBottom: 24,
              shadowColor: colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Image
              source={require("../assets/images/logo.png")}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Feather name={current.icon as any} size={32} color={colors.primary} />
          </View>
        )}

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            marginBottom: 8,
          }}
        >
          {current.title}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.mutedForeground,
            marginBottom: 32,
            lineHeight: 22,
          }}
        >
          {current.subtitle}
        </Text>

        {/* Step content */}
        {step === 0 && (
          <>
            <Input
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
            />
            <Input
              label="Username (optional)"
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. rahul_sharma"
            />
          </>
        )}

        {step === 1 && (
          <>
            <Input
              label="Monthly salary"
              value={monthly}
              onChangeText={setMonthly}
              placeholder="50000"
              keyboardType="decimal-pad"
              prefix="₹"
            />
            <Input
              label="Other monthly income (optional)"
              value={other}
              onChangeText={setOther}
              placeholder="Freelance, side gigs..."
              keyboardType="decimal-pad"
              prefix="₹"
            />
          </>
        )}

        {step === 2 && (
          <Input
            label="Current total savings"
            value={savings}
            onChangeText={setSavings}
            placeholder="100000"
            keyboardType="decimal-pad"
            prefix="₹"
          />
        )}

        {step === 3 && (
          <>
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
                marginBottom: 16,
              }}
            >
              Add prices for things you're saving towards. You can always add more later.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Bike goal name"
                  value={bikeName}
                  onChangeText={setBikeName}
                  placeholder="Dream Bike"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Target price"
                  value={bikePrice}
                  onChangeText={setBikePrice}
                  placeholder="150000"
                  keyboardType="decimal-pad"
                  prefix="₹"
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Car goal name"
                  value={carName}
                  onChangeText={setCarName}
                  placeholder="Dream Car"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Target price"
                  value={carPrice}
                  onChangeText={setCarPrice}
                  placeholder="800000"
                  keyboardType="decimal-pad"
                  prefix="₹"
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Home goal name"
                  value={flatName}
                  onChangeText={setFlatName}
                  placeholder="Dream Home"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Target price"
                  value={flatPrice}
                  onChangeText={setFlatPrice}
                  placeholder="5000000"
                  keyboardType="decimal-pad"
                  prefix="₹"
                />
              </View>
            </View>
          </>
        )}

        {step === 4 && (
          <View style={{ gap: 12 }}>
            {[
              { icon: "bar-chart-2", label: "Income, savings & balance" },
              { icon: "credit-card", label: "Expense tracker" },
              { icon: "target", label: "Savings goals" },
              { icon: "users", label: "Bill splitter" },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: colors.secondary,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Feather name={item.icon as any} size={18} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontSize: 15 }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flex: 1, minHeight: 32 }} />

        {/* Navigation */}
        <View style={{ gap: 12, marginTop: 24 }}>
          {step < totalSteps - 1 ? (
            <Button
              title={step === 0 ? "Get Started" : "Continue"}
              onPress={goNext}
              disabled={!canProceed()}
            />
          ) : (
            <Button title="Enter WealthTrack" onPress={finish} />
          )}
          {step > 0 && (
            <Button title="Back" onPress={goPrev} variant="ghost" />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({});
